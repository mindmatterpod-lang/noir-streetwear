import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { PurchasePanel } from "@/components/shop/PurchasePanel";
import { RelatedProducts } from "@/components/shop/RelatedProducts";
import { Reviews } from "@/components/shop/Reviews";
import { ShippingNote } from "@/components/shop/ShippingNote";
import { SizeGuide } from "@/components/shop/SizeGuide";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { formatPrice } from "@/lib/format";
import { policyExcerpt } from "@/lib/policy-excerpts";
import { fetchProducts } from "@/lib/products-api";
import { getProduct } from "@/lib/store-catalog";
import { COLOR_NAMES } from "@/types/store";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    await fetchProducts().catch(() => []);
    const product = getProduct(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    const product = loaderData?.product;
    return {
      meta: [
        { title: `${product?.name ?? "Product"} — Nowhere` },
        { name: "description", content: product?.description.slice(0, 155) ?? "" },
        { property: "og:title", content: product?.name ?? "Product" },
        { property: "og:type", content: "product" },
      ],
      scripts: product
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                name: product.name,
                description: product.description,
                category: product.category,
                sku: product.slug,
                offers: {
                  "@type": "Offer",
                  priceCurrency: "PKR",
                  price: (product.priceCents / 100).toFixed(2),
                  availability:
                    product.stock > 0
                      ? "https://schema.org/InStock"
                      : "https://schema.org/OutOfStock",
                },
              }),
            },
          ]
        : [],
    };
  },
  notFoundComponent: () => (
    <SiteLayout>
      <div className="py-24 text-center">
        <h1 className="text-2xl font-black uppercase">Piece not found</h1>
        <Link
          to="/shop"
          search={{ category: "All pieces" }}
          className="mt-4 inline-block underline"
        >
          Back to shop
        </Link>
      </div>
    </SiteLayout>
  ),
  component: ProductDetail,
});

function ProductDetail() {
  const { product } = Route.useLoaderData();
  const gallery = product.images ?? [
    product.image,
    ...(product.alternateImage ? [product.alternateImage] : []),
  ];
  const sectionTitle = "text-sm font-medium uppercase tracking-[0.18em]";
  const prose = "text-sm leading-relaxed text-muted-foreground";
  const sizingNote = policyExcerpt("size-guide", "How to measure");
  const deliveryNote = policyExcerpt("shipping-returns", "Delivery across Pakistan");
  const exchangeNote = policyExcerpt("shipping-returns", "Exchanges and returns");

  return (
    <SiteLayout>
      <div className="page-container pb-24 pt-6 md:pb-16">
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <Link to="/" className="py-2 hover:text-foreground">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                to="/shop"
                search={{ category: product.category }}
                className="py-2 hover:text-foreground"
              >
                {product.category}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-foreground">
              {product.name}
            </li>
          </ol>
        </nav>

        <div className="mt-6 grid gap-x-14 gap-y-10 lg:grid-cols-[3fr_2fr]">
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <ProductGallery images={gallery} name={product.name} />
          </div>

          <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <div className="lg:sticky lg:top-24">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                {product.category}
              </p>
              <h1 className="display-heading mt-3 text-[clamp(2.1rem,7vw,4.25rem)] [overflow-wrap:anywhere]">
                {product.name}
              </h1>
              <p className="mt-4 text-xl tabular-nums">{formatPrice(product.priceCents)}</p>
              <p className={`mt-5 ${prose}`}>{product.description}</p>
              <div className="mt-8">
                <PurchasePanel product={product} stickyBar />
              </div>
              <div className="mt-6 space-y-2 border-t border-border pt-5">
                <ShippingNote className="text-xs leading-relaxed text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  7-day exchange on unworn items.{" "}
                  <Link
                    to="/policies/$slug"
                    params={{ slug: "shipping-returns" }}
                    className="underline underline-offset-4"
                  >
                    Read the policy
                  </Link>
                </p>
              </div>
            </div>
          </div>

          <div className="min-w-0 lg:col-start-1 lg:row-start-2">
            <Accordion
              type="multiple"
              defaultValue={["details"]}
              className="border-t border-border"
            >
              <AccordionItem value="details">
                <AccordionTrigger className={sectionTitle}>Product details</AccordionTrigger>
                <AccordionContent>
                  <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Category</dt>
                    <dd>{product.category}</dd>
                    {product.colors.length > 0 && (
                      <>
                        <dt className="text-muted-foreground">Colours</dt>
                        <dd>{product.colors.map((c) => COLOR_NAMES[c]).join(", ")}</dd>
                      </>
                    )}
                    <dt className="text-muted-foreground">Availability</dt>
                    <dd>
                      {product.stock <= 0
                        ? "Sold out"
                        : product.stock <= 10
                          ? `Only ${product.stock} left`
                          : "In stock"}
                    </dd>
                  </dl>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="fit">
                <AccordionTrigger className={sectionTitle}>Fit &amp; sizing</AccordionTrigger>
                <AccordionContent>
                  {sizingNote && <p className={prose}>{sizingNote}</p>}
                  <SizeGuide selected={null} className="mt-2" />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="shipping">
                <AccordionTrigger className={sectionTitle}>
                  Shipping &amp; delivery
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  {deliveryNote && <p className={prose}>{deliveryNote}</p>}
                  <ShippingNote className="text-sm text-foreground" />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="exchange">
                <AccordionTrigger className={sectionTitle}>Exchange policy</AccordionTrigger>
                <AccordionContent className="space-y-3">
                  {exchangeNote && <p className={prose}>{exchangeNote}</p>}
                  <Link
                    to="/policies/$slug"
                    params={{ slug: "shipping-returns" }}
                    className="inline-block py-1 text-xs uppercase tracking-[0.18em] underline underline-offset-4"
                  >
                    Full delivery &amp; returns policy
                  </Link>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>
      <RelatedProducts product={product} />
      <Reviews productId={product.dbId} productName={product.name} />
    </SiteLayout>
  );
}
