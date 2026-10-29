import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";

import { publicAnalytics } from "@/lib/public-settings.functions";
import { ANALYTICS_DEFAULTS } from "@/lib/analytics-config";

import appCss from "../styles.css?url";
import { Layout } from "@/components/Layout";
import { Toaster } from "@/components/ui/sonner";
import { CartPersistence } from "@/components/CartPersistence";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: () => publicAnalytics(),
  head: ({ loaderData }) => {
    const analytics = loaderData ?? ANALYTICS_DEFAULTS;
    return ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Indian Handicraft Standards — Authentic Lucknowi Chikankari" },
      { name: "description", content: "Authentic hand-embroidered Lucknowi Chikankari kurtis, sarees, sharara sets & more. Trusted by 10,000+ customers since 2015." },
      ...(analytics.gsc_verification ? [{ name: "google-site-verification", content: analytics.gsc_verification }] : []),
      { name: "author", content: "Indian Handicraft Standards" },
      { property: "og:title", content: "Indian Handicraft Standards — Authentic Lucknowi Chikankari" },
      { property: "og:description", content: "Authentic hand-embroidered Lucknowi Chikankari kurtis, sarees, sharara sets & more. Trusted by 10,000+ customers since 2015." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Indian Handicraft Standards" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Indian Handicraft Standards — Authentic Lucknowi Chikankari" },
      { name: "twitter:description", content: "Authentic hand-embroidered Lucknowi Chikankari kurtis, sarees, sharara sets & more. Trusted by 10,000+ customers since 2015." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Lato:wght@300;400;500;700;900&family=Archivo+Black&family=Playfair+Display:wght@500;600;700&family=Inter:wght@400;500;600&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Indian Handicraft Standards",
          url: "https://indianhandicraft.revnlabel.in",
          logo: "https://indianhandicraft.revnlabel.in/favicon.ico",
          sameAs: [],
        }),
      },
      ...(analytics.gtm_id ? [{ type: "text/javascript", children: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(analytics.gtm_id)});` }] : []),
      ...(analytics.ga4_id ? [{ type: "text/javascript", src: `https://www.googletagmanager.com/gtag/js?id=${analytics.ga4_id}`, async: true }, { type: "text/javascript", children: `window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config',${JSON.stringify(analytics.ga4_id)});` }] : []),
      ...(analytics.meta_pixel_id ? [{ type: "text/javascript", children: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=true;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=true;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(analytics.meta_pixel_id)});fbq('track','PageView');` }] : []),
    ],
  });
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  const analytics = Route.useLoaderData() ?? ANALYTICS_DEFAULTS;
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {analytics.gtm_id && <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${analytics.gtm_id}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>}
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <CartPersistence />
      <Layout>
        <Outlet />
      </Layout>
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}
