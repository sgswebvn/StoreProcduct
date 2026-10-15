import React from 'react';
import Script from 'next/script';
import { ScriptService } from '@/modules/settings/services/script.service';

export async function ScriptInjector({
  location,
}: {
  location: 'head' | 'body_start' | 'footer';
}) {
  try {
    const scripts = await ScriptService.getActiveScripts('admin');
    const matched = scripts.filter((s) => s.location === location);

    if (!matched.length) return null;

    return (
      <>
        {matched.map((s) => {
          if (s.type === 'ga4' && s.config?.trackingId) {
            return (
              <React.Fragment key={s._id.toString()}>
                <Script
                  src={`https://www.googletagmanager.com/gtag/js?id=${s.config.trackingId}`}
                  strategy="afterInteractive"
                />
                <Script id={`ga4-init-${s._id}`} strategy="afterInteractive">
                  {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${s.config.trackingId}');
                  `}
                </Script>
              </React.Fragment>
            );
          }

          if (s.type === 'gtm' && s.config?.trackingId) {
            return (
              <Script id={`gtm-init-${s._id}`} key={s._id.toString()} strategy="afterInteractive">
                {`
                  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                  })(window,document,'script','dataLayer','${s.config.trackingId}');
                `}
              </Script>
            );
          }

          if (s.type === 'custom' && s.config?.code) {
            return (
              <div
                key={s._id.toString()}
                dangerouslySetInnerHTML={{ __html: s.config.code }}
              />
            );
          }

          return null;
        })}
      </>
    );
  } catch (err) {
    // Không làm sập ứng dụng nếu nạp script thất bại
    console.error('[ScriptInjector] Lỗi nạp script:', err);
    return null;
  }
}
