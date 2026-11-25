import {
  BUSINESS_ADDRESS,
  SITE_NAME,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  WHATSAPP_NUMBER,
} from "@/lib/site-config";

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
    title: "Delivery & returns",
    description: `Delivery times, charges and the ${SITE_NAME} returns policy for Pakistan.`,
    sections: [
      {
        heading: "Processing",
        body: [
          "Orders are confirmed and dispatched within 1–2 working days. For cash on delivery we may call or message you on the mobile number you gave to confirm your order, so please keep it reachable.",
        ],
      },
      {
        heading: "Delivery across Pakistan",
        body: [
          "We deliver to all provinces through trusted couriers. Delivery usually takes 2–4 working days to major cities and 4–7 working days elsewhere. The delivery charge is shown at checkout, and orders above the free-delivery amount ship free.",
          "We currently deliver within Pakistan only. International delivery is coming soon.",
        ],
      },
      {
        heading: "Payment on delivery",
        body: [
          "Pay the courier in cash when your parcel arrives. Please check the parcel in front of the rider and tell us straight away if something is wrong.",
        ],
      },
      {
        heading: "Exchanges and returns",
        body: [
          "You can request an exchange or return within 7 days of delivery for unworn, unwashed items with tags attached. Sale items are exchange-only.",
          `To start, message us on WhatsApp (${WHATSAPP_NUMBER}) or email ${SUPPORT_EMAIL} with your order number. If the item arrived damaged or wrong, we cover the return courier cost. For size exchanges the customer pays the return courier.`,
          "Refunds for card payments go back to the original card. Refunds for cash-on-delivery orders are sent by bank transfer, Easypaisa or JazzCash.",
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
          `WhatsApp / phone: ${SUPPORT_PHONE}`,
          `Email: ${SUPPORT_EMAIL}`,
          `Address: ${BUSINESS_ADDRESS}`,
          "We reply within one working day, usually much sooner on WhatsApp.",
        ],
      },
      {
        heading: "How do I track my order?",
        body: [
          "Open the link in your confirmation email, or sign in and open your account. You will see the status and the courier tracking number once it ships.",
        ],
      },
      {
        heading: "Do you have cash on delivery?",
        body: [
          "Yes. Cash on delivery is available across Pakistan. Card payment will be added soon.",
        ],
      },
      {
        heading: "Can I change my address or order?",
        body: [
          "Yes, while it is Pending or Processing. Message us on WhatsApp with your order number.",
        ],
      },
      {
        heading: "Do you deliver outside Pakistan?",
        body: ["Not yet, but we plan to. Follow us for updates."],
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
          "Account details (email, name, mobile number, saved addresses and saved pieces), order details (name, mobile number, delivery address, items purchased), your email address if you join our newsletter (with the date you agreed), and basic site analytics. Card payments are handled by our payment provider; we do not store card numbers.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "To process and deliver orders, send order emails, provide support, prevent fraud and improve the store. We send marketing emails only if you subscribed, and every one includes an unsubscribe link. We do not sell your personal data.",
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
          "We store your bag, saved pieces, recently viewed pieces and theme choice in your browser. We use privacy-friendly, cookie-free analytics to understand site performance and which pieces are popular; these events never include your name, email, phone number or address.",
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
          "Prices are in Pakistani Rupees (PKR) and include any applicable taxes unless stated. The delivery charge is shown at checkout before you place your order.",
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
