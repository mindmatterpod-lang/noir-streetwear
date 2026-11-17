import { BUSINESS_ADDRESS, SITE_NAME, SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/site-config";

export interface PolicySection {
  heading: string;
  body: string[];
}
export interface Policy {
  title: string;
  description: string;
  sections: PolicySection[];
  table?: { head: string[]; rows: string[][] };
}

// Starter text only: have it reviewed against the laws of the countries you sell in before launch.
export const POLICIES: Record<string, Policy> = {
  "shipping-returns": {
    title: "Shipping & returns",
    description: `Shipping times, costs and the ${SITE_NAME} returns policy.`,
    sections: [
      {
        heading: "Processing",
        body: [
          "Orders are processed within 1–2 business days. You will receive an email when your order is confirmed and again when it ships, with a tracking number where available.",
        ],
      },
      {
        heading: "Shipping costs and delivery",
        body: [
          "Shipping is a flat rate shown at checkout, and orders above the free-shipping threshold ship free. Delivery usually takes 3–7 business days domestically and 7–14 internationally, depending on your location and carrier.",
        ],
      },
      {
        heading: "Returns",
        body: [
          "You can return unworn, unwashed items with tags attached within 14 days of delivery for a refund to your original payment method. Items marked final sale cannot be returned.",
          `To start a return, email ${SUPPORT_EMAIL} with your order number. Return shipping is paid by the customer unless the item arrived damaged or incorrect.`,
        ],
      },
      {
        heading: "Damaged or wrong items",
        body: [
          "If something arrives damaged or isn't what you ordered, contact us within 7 days with a photo and we will replace it or refund you.",
        ],
      },
      {
        heading: "Cancellations",
        body: [
          "Orders can be cancelled while their status is Pending or Processing. Contact us as soon as possible.",
        ],
      },
    ],
  },
  "size-guide": {
    title: "Size guide",
    description: "Measurements to help you choose the right size.",
    sections: [
      {
        heading: "How to measure",
        body: [
          "Measure your chest at the fullest point and your waist at the narrowest. Our cuts are relaxed: for a fitted look, size down; for an oversized look, size up. Measurements are approximate and may vary by up to 2 cm.",
        ],
      },
    ],
    table: {
      head: ["Size", "Chest (cm)", "Waist (cm)", "Chest (in)", "Waist (in)"],
      rows: [
        ["S", "92–97", "76–81", "36–38", "30–32"],
        ["M", "98–103", "82–87", "39–41", "32–34"],
        ["L", "104–109", "88–93", "41–43", "35–37"],
        ["XL", "110–115", "94–99", "43–45", "37–39"],
        ["XXL", "116–121", "100–105", "46–48", "39–41"],
      ],
    },
  },
  contact: {
    title: "Contact & FAQ",
    description: `Get in touch with ${SITE_NAME} and read common questions.`,
    sections: [
      {
        heading: "Contact us",
        body: [
          `Email: ${SUPPORT_EMAIL}`,
          `Phone: ${SUPPORT_PHONE}`,
          `Address: ${BUSINESS_ADDRESS}`,
          "We reply within one business day.",
        ],
      },
      {
        heading: "How do I track my order?",
        body: [
          "Sign in and open your account to see live order status and tracking numbers. Guest customers can use the order link from their confirmation email.",
        ],
      },
      {
        heading: "Which payment methods do you accept?",
        body: [
          "Cards through our secure payment provider, and cash on delivery where available. We never see or store your card details.",
        ],
      },
      {
        heading: "Can I change my order?",
        body: ["Yes, while it is Pending or Processing. Email us with your order number."],
      },
      {
        heading: "Do you ship internationally?",
        body: ["Yes. Delivery times and costs are shown at checkout."],
      },
    ],
  },
  privacy: {
    title: "Privacy policy",
    description: `How ${SITE_NAME} collects and uses your data.`,
    sections: [
      {
        heading: "What we collect",
        body: [
          "Account details (email), order details (name, shipping address, items purchased), and basic site analytics. Card payments are handled by our payment provider; we do not store card numbers.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "To process and deliver orders, send order emails, provide support, prevent fraud and improve the store. We do not sell your personal data.",
        ],
      },
      {
        heading: "Who we share it with",
        body: [
          "Service providers that help us run the store: hosting, database, payments, email and shipping carriers. They may only use your data to provide their service.",
        ],
      },
      {
        heading: "Cookies and storage",
        body: [
          "We store your bag, wishlist and theme choice in your browser, and use privacy-friendly analytics to understand site performance.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          `You can ask to access, correct or delete your data at any time by emailing ${SUPPORT_EMAIL}. Order records may be kept as required for tax and accounting.`,
        ],
      },
    ],
  },
  terms: {
    title: "Terms of service",
    description: `Terms for shopping with ${SITE_NAME}.`,
    sections: [
      {
        heading: "Orders",
        body: [
          "By placing an order you confirm the details are correct. We may cancel orders affected by pricing errors, stock issues or suspected fraud, and will refund any payment made.",
        ],
      },
      {
        heading: "Pricing and payment",
        body: [
          "Prices are shown in USD and include no taxes unless stated. Taxes and shipping are shown at checkout before you pay.",
        ],
      },
      {
        heading: "Intellectual property",
        body: [
          "All images, text and branding on this site belong to us and may not be reused without permission.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "To the extent permitted by law, our liability is limited to the value of your order. Nothing here limits your statutory consumer rights.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "We may update these terms from time to time. The version on this page applies to orders placed while it is published.",
        ],
      },
    ],
  },
};
