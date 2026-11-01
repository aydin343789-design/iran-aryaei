"use client";

export default function IranAryaeiTools() {
  return (
    <section className="ia-shell" aria-label="ابزارهای ایران آریایی">
      <div className="ia-toolbar">
        <div>
          <p className="ia-kicker">جعبه‌ابزار مستقل و آفلاین</p>
          <h1 className="ia-title">ایران آریایی</h1>
        </div>
        <a className="ia-open" href="/iran-aryaei/index.html" target="_blank" rel="noreferrer">
          باز کردن تمام‌صفحه
        </a>
      </div>
      <iframe
        className="ia-frame"
        title="جعبه‌ابزار ایران آریایی"
        src="/iran-aryaei/index.html"
      />
    </section>
  );
}
