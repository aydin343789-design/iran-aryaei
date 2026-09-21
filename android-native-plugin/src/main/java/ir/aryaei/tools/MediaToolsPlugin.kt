package ir.aryaei.tools

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.graphics.pdf.PdfRenderer
import android.media.*
import android.net.Uri
import android.os.Build
import android.os.ParcelFileDescriptor
import android.util.Base64
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer

/**
 * MediaToolsPlugin — native implementations for tools 26-33 (the ones the
 * original spec marks as needing Java/Kotlin, not just JS/canvas).
 *
 * IMPORTANT — read before wiring this into the UI:
 * I have no Android SDK / Gradle / JDK in the sandbox this was written in,
 * so none of this has been compiled or run. Each method below is annotated
 * with my actual confidence level. Treat this as a solid, idiomatic starting
 * point to debug in Android Studio — not as tested, working code.
 *
 * Required Gradle dependencies (add to android/app/build.gradle):
 *   implementation "com.google.mlkit:segmentation-selfie:16.0.0-beta6"   // background removal
 *   implementation "androidx.heifwriter:heifwriter:1.0.0"                // JPG -> HEIC
 *   // Video compression (see compressVideo below) realistically wants:
 *   implementation "androidx.media3:media3-transformer:1.4.1"
 *   implementation "androidx.media3:media3-effect:1.4.1"
 */
@CapacitorPlugin(name = "MediaTools")
class MediaToolsPlugin : Plugin() {

    private fun cacheFile(name: String): File = File(context.cacheDir, name)

    // =====================================================================
    // 33. Convert PDF to Images
    // CONFIDENCE: HIGH. android.graphics.pdf.PdfRenderer is a stable public
    // API since Android 5.0 (API 21). No third-party library needed at all.
    // =====================================================================
    @PluginMethod
    fun pdfToImages(call: PluginCall) {
        val path = call.getString("path") ?: return call.reject("path is required")
        try {
            val file = File(path)
            val pfd = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
            val renderer = PdfRenderer(pfd)
            val pages = JSArray()
            for (i in 0 until renderer.pageCount) {
                val page = renderer.openPage(i)
                val scale = 2 // ~192dpi; raise for sharper output at the cost of memory
                val bmp = Bitmap.createBitmap(page.width * scale, page.height * scale, Bitmap.Config.ARGB_8888)
                bmp.eraseColor(android.graphics.Color.WHITE)
                page.render(bmp, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                val out = ByteArrayOutputStream()
                bmp.compress(Bitmap.CompressFormat.PNG, 100, out)
                pages.put("data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP))
                page.close()
                bmp.recycle()
            }
            renderer.close()
            pfd.close()
            val result = JSObject()
            result.put("pages", pages)
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("PDF rendering failed: ${e.message}", e)
        }
    }

    // =====================================================================
    // 32. Remove Photo Background
    // CONFIDENCE: MEDIUM-HIGH. ML Kit Selfie Segmentation runs fully
    // on-device (no network call per-request; the model ships via Play
    // Services on first use). The API shape below matches ML Kit's
    // documented usage — worth double-checking the exact class names
    // against the current ML Kit version when you wire this up.
    // =====================================================================
    @PluginMethod
    fun removeBackground(call: PluginCall) {
        val path = call.getString("path") ?: return call.reject("path is required")
        try {
            val bitmap = BitmapFactory.decodeFile(path) ?: return call.reject("Could not decode image")
            val image = com.google.mlkit.vision.common.InputImage.fromBitmap(bitmap, 0)
            val options = com.google.mlkit.vision.segmentation.selfie.SelfieSegmenterOptions.Builder()
                .setDetectorMode(com.google.mlkit.vision.segmentation.selfie.SelfieSegmenterOptions.SINGLE_IMAGE_MODE)
                .enableRawSizeMask()
                .build()
            val segmenter = com.google.mlkit.vision.segmentation.selfie.SelfieSegmentation.getClient(options)
            segmenter.process(image)
                .addOnSuccessListener { mask ->
                    val out = Bitmap.createBitmap(bitmap.width, bitmap.height, Bitmap.Config.ARGB_8888)
                    val buffer = mask.buffer
                    val mw = mask.width; val mh = mask.height
                    for (y in 0 until mh) {
                        for (x in 0 until mw) {
                            val confidence = buffer.float
                            val srcPixel = bitmap.getPixel(
                                (x * bitmap.width / mw).coerceIn(0, bitmap.width - 1),
                                (y * bitmap.height / mh).coerceIn(0, bitmap.height - 1)
                            )
                            val alpha = (confidence * 255).toInt().coerceIn(0, 255)
                            val withAlpha = (srcPixel and 0x00FFFFFF) or (alpha shl 24)
                            out.setPixel(x, y, withAlpha)
                        }
                    }
                    val outStream = ByteArrayOutputStream()
                    out.compress(Bitmap.CompressFormat.PNG, 100, outStream)
                    val result = JSObject()
                    result.put("data", "data:image/png;base64," + Base64.encodeToString(outStream.toByteArray(), Base64.NO_WRAP))
                    call.resolve(result)
                }
                .addOnFailureListener { e -> call.reject("Segmentation failed: ${e.message}", e) }
        } catch (e: Exception) {
            call.reject("Background removal failed: ${e.message}", e)
        }
    }

    // =====================================================================
    // 31. Convert HEIC to JPG
    // CONFIDENCE: MEDIUM-HIGH. Android has decoded HEIF/HEIC natively since
    // API 28 (Pie) — ImageDecoder handles it with no extra library.
    // =====================================================================
    @PluginMethod
    fun heicToJpg(call: PluginCall) {
        val path = call.getString("path") ?: return call.reject("path is required")
        try {
            val bitmap: Bitmap = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val source = ImageDecoder.createSource(File(path))
                ImageDecoder.decodeBitmap(source)
            } else {
                return call.reject("HEIC decoding needs Android 9 (API 28) or newer")
            }
            val out = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.JPEG, 90, out)
            val result = JSObject()
            result.put("data", "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP))
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("HEIC decode failed: ${e.message}", e)
        }
    }

    // =====================================================================
    // 30. Convert Image to HEIC
    // CONFIDENCE: MEDIUM. Uses androidx.heifwriter (Jetpack). Less
    // commonly exercised code path than the decode direction above —
    // budget real testing time here.
    // =====================================================================
    @PluginMethod
    fun imageToHeic(call: PluginCall) {
        val path = call.getString("path") ?: return call.reject("path is required")
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
                return call.reject("HEIC encoding needs a modern Android version")
            }
            val bitmap = BitmapFactory.decodeFile(path) ?: return call.reject("Could not decode image")
            val outFile = cacheFile("heic-${System.currentTimeMillis()}.heic")
            val writer = androidx.heifwriter.HeifWriter.Builder(
                outFile.absolutePath, bitmap.width, bitmap.height, androidx.heifwriter.HeifWriter.INPUT_MODE_BITMAP
            ).setQuality(90).build()
            writer.start()
            writer.addBitmap(bitmap)
            writer.stop(3000)
            writer.close()
            val result = JSObject()
            result.put("path", outFile.absolutePath)
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("HEIC encode failed: ${e.message}", e)
        }
    }

    // =====================================================================
    // 26. Audio Trimmer
    // CONFIDENCE: MEDIUM. This copies compressed samples directly
    // (MediaExtractor -> MediaMuxer) without re-encoding, which is the
    // right approach for speed/quality — but trims will snap to the
    // nearest keyframe rather than being sample-accurate. Good enough for
    // a general trim tool; flag this to users if sample-accuracy matters.
    // =====================================================================
    @PluginMethod
    fun trimAudio(call: PluginCall) {
        val path = call.getString("path") ?: return call.reject("path is required")
        val startMs = call.getInt("startMs") ?: 0
        val endMs = call.getInt("endMs") ?: return call.reject("endMs is required")
        try {
            val extractor = MediaExtractor()
            extractor.setDataSource(path)
            var audioTrack = -1
            var format: MediaFormat? = null
            for (i in 0 until extractor.trackCount) {
                val f = extractor.getTrackFormat(i)
                if (f.getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true) {
                    audioTrack = i; format = f; break
                }
            }
            if (audioTrack < 0 || format == null) return call.reject("No audio track found")
            extractor.selectTrack(audioTrack)
            extractor.seekTo(startMs * 1000L, MediaExtractor.SEEK_TO_CLOSEST_SYNC)

            val outFile = cacheFile("trimmed-${System.currentTimeMillis()}.m4a")
            val muxer = MediaMuxer(outFile.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
            val outTrack = muxer.addTrack(format)
            muxer.start()

            val buffer = ByteBuffer.allocate(1 shl 20)
            val bufferInfo = MediaCodec.BufferInfo()
            while (true) {
                val sampleTime = extractor.sampleTime
                if (sampleTime < 0 || sampleTime > endMs * 1000L) break
                val size = extractor.readSampleData(buffer, 0)
                if (size < 0) break
                bufferInfo.offset = 0
                bufferInfo.size = size
                bufferInfo.presentationTimeUs = sampleTime - startMs * 1000L
                bufferInfo.flags = extractor.sampleFlags
                muxer.writeSampleData(outTrack, buffer, bufferInfo)
                extractor.advance()
            }
            muxer.stop(); muxer.release(); extractor.release()
            val result = JSObject()
            result.put("path", outFile.absolutePath)
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("Audio trim failed: ${e.message}", e)
        }
    }

    // =====================================================================
    // 27/28. Audio Size Reducer & "Convert to MP3"
    // CONFIDENCE: LOW-MEDIUM, and one honest scope change: Android has no
    // built-in MP3 *encoder* (only decoding is supported), and there's no
    // network access in my sandbox to fetch a bundled LAME/JNI encoder.
    // The realistic fully-offline substitute is AAC in an .m4a container,
    // which every Android device can both play and encode natively via
    // MediaCodec — same purpose (small, compatible audio file), different
    // extension. I'd suggest relabeling this tool "Compress / Convert
    // Audio (AAC)" in the UI rather than promising literal .mp3 output.
    // The actual MediaCodec encode loop (transcode-with-re-encoding) is
    // the fiddliest part of this whole plugin to get right — this is a
    // reasonable skeleton, not a drop-in-and-done implementation.
    // =====================================================================
    @PluginMethod
    fun compressAudioToAac(call: PluginCall) {
        val path = call.getString("path") ?: return call.reject("path is required")
        val bitrate = call.getInt("bitrate") ?: 96000
        try {
            val extractor = MediaExtractor()
            extractor.setDataSource(path)
            var inTrack = -1; var inFormat: MediaFormat? = null
            for (i in 0 until extractor.trackCount) {
                val f = extractor.getTrackFormat(i)
                if (f.getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true) { inTrack = i; inFormat = f; break }
            }
            if (inTrack < 0 || inFormat == null) return call.reject("No audio track found")
            extractor.selectTrack(inTrack)

            val sampleRate = inFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            val channelCount = inFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT)

            val decoder = MediaCodec.createDecoderByType(inFormat.getString(MediaFormat.KEY_MIME)!!)
            decoder.configure(inFormat, null, null, 0)
            decoder.start()

            val outFormat = MediaFormat.createAudioFormat(MediaFormat.MIMETYPE_AUDIO_AAC, sampleRate, channelCount)
            outFormat.setInteger(MediaFormat.KEY_AAC_PROFILE, MediaCodecInfo.CodecProfileLevel.AACObjectLC)
            outFormat.setInteger(MediaFormat.KEY_BIT_RATE, bitrate)
            val encoder = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_AUDIO_AAC)
            encoder.configure(outFormat, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
            encoder.start()

            val outFile = cacheFile("compressed-${System.currentTimeMillis()}.m4a")
            val muxer = MediaMuxer(outFile.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
            var muxerTrack = -1
            var muxerStarted = false

            val bufferInfo = MediaCodec.BufferInfo()
            var sawInputEOS = false
            var sawOutputEOS = false

            // NOTE: this simple synchronous pump loop is the classic pattern for
            // MediaCodec transcoding but can stall on some devices/inputs — a
            // production version should add timeouts/retries around each
            // dequeue call. Flagging this explicitly since it's the most likely
            // spot to need real debugging.
            while (!sawOutputEOS) {
                if (!sawInputEOS) {
                    val inIndex = decoder.dequeueInputBuffer(10000)
                    if (inIndex >= 0) {
                        val inBuf = decoder.getInputBuffer(inIndex)!!
                        val sampleSize = extractor.readSampleData(inBuf, 0)
                        if (sampleSize < 0) {
                            decoder.queueInputBuffer(inIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                            sawInputEOS = true
                        } else {
                            decoder.queueInputBuffer(inIndex, 0, sampleSize, extractor.sampleTime, 0)
                            extractor.advance()
                        }
                    }
                }
                val decOutIndex = decoder.dequeueOutputBuffer(bufferInfo, 10000)
                if (decOutIndex >= 0) {
                    val decodedBuf = decoder.getOutputBuffer(decOutIndex)!!
                    val encInIndex = encoder.dequeueInputBuffer(10000)
                    if (encInIndex >= 0) {
                        val encInBuf = encoder.getInputBuffer(encInIndex)!!
                        encInBuf.put(decodedBuf)
                        encoder.queueInputBuffer(encInIndex, 0, bufferInfo.size, bufferInfo.presentationTimeUs,
                            if (bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) MediaCodec.BUFFER_FLAG_END_OF_STREAM else 0)
                    }
                    decoder.releaseOutputBuffer(decOutIndex, false)
                }
                val encOutIndex = encoder.dequeueOutputBuffer(bufferInfo, 10000)
                if (encOutIndex >= 0) {
                    val encodedBuf = encoder.getOutputBuffer(encOutIndex)!!
                    if (!muxerStarted) {
                        muxerTrack = muxer.addTrack(encoder.outputFormat)
                        muxer.start()
                        muxerStarted = true
                    }
                    if (bufferInfo.size > 0) muxer.writeSampleData(muxerTrack, encodedBuf, bufferInfo)
                    if (bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) sawOutputEOS = true
                    encoder.releaseOutputBuffer(encOutIndex, false)
                } else if (encOutIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED && !muxerStarted) {
                    muxerTrack = muxer.addTrack(encoder.outputFormat)
                    muxer.start()
                    muxerStarted = true
                }
            }
            decoder.stop(); decoder.release()
            encoder.stop(); encoder.release()
            muxer.stop(); muxer.release()
            extractor.release()

            val result = JSObject()
            result.put("path", outFile.absolutePath)
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("Audio compression failed: ${e.message}", e)
        }
    }

    // =====================================================================
    // 29. Video Size Reducer
    // CONFIDENCE: LOW for a hand-rolled version — raw MediaCodec video
    // transcoding (dealing with Surface-based color formats, B-frames,
    // rotation metadata, etc.) is genuinely one of the more error-prone
    // corners of Android media APIs. The realistic path is Jetpack Media3's
    // Transformer API, which wraps exactly this and is what I'd actually
    // recommend shipping rather than reinventing it — sketch below.
    // =====================================================================
    @PluginMethod
    fun compressVideo(call: PluginCall) {
        val path = call.getString("path") ?: return call.reject("path is required")
        val quality = call.getString("quality") ?: "medium" // low | medium | high
        try {
            val bitrate = when (quality) { "low" -> 1_000_000; "high" -> 5_000_000; else -> 2_500_000 }
            val outFile = cacheFile("compressed-${System.currentTimeMillis()}.mp4")

            // Sketch only — wire up androidx.media3:media3-transformer and adapt:
            //
            //   val transformer = Transformer.Builder(context)
            //       .setVideoMimeType(MimeTypes.VIDEO_H264)
            //       .setEncoderFactory(DefaultEncoderFactory.Builder(context)
            //           .setRequestedVideoEncoderSettings(
            //               VideoEncoderSettings.Builder().setBitrate(bitrate).build())
            //           .build())
            //       .addListener(object : Transformer.Listener {
            //           override fun onCompleted(composition: Composition, result: ExportResult) {
            //               val res = JSObject(); res.put("path", outFile.absolutePath); call.resolve(res)
            //           }
            //           override fun onError(composition: Composition, result: ExportResult, e: ExportException) {
            //               call.reject("Video compression failed: ${e.message}", e)
            //           }
            //       })
            //       .build()
            //   transformer.start(MediaItem.fromUri(Uri.fromFile(File(path))), outFile.absolutePath)
            //
            // Left as a sketch rather than wired up: Media3 Transformer's exact
            // builder API has shifted across versions, and I can't pin/verify a
            // version against real Gradle resolution from this sandbox.
            call.reject("Video compression needs the Media3 Transformer wiring above — see code comments")
        } catch (e: Exception) {
            call.reject("Video compression failed: ${e.message}", e)
        }
    }
}
