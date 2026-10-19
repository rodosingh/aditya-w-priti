/**
 * ADITYA & PRITI — YOUR WEDDING DETAILS
 * Edit this file to update the page. After changing invitation details,
 * run `npm run invitation` to refresh the downloadable PDF as well.
 *
 * rsvp.mode: "google-sheets", "phone", "whatsapp", "email", "formspree", "external", or "demo".
 * The Grand Dinner runs from 7 PM on 4 December to midnight on 5 December.
 * All timestamps include India's UTC offset; the Wedding ends on 3 December.
 */
window.WEDDING = {
  couple: {
    first: "Aditya",
    second: "Priti",
    groomNickname: "Shiba",
    brideNickname: "Rekha",
    groomParents: "Mrs Dipali & Mr Dileswar Singh",
    brideParents: "Mrs Kalpana & Mr Harishchandra Mohapatra",
  },
  intro: "Rooted in tradition. Joined in love.",
  invitation:
    "With the blessings of Lord Jagannath and our families, we joyfully invite you to celebrate our wedding and the beginning of our life together.",
  start: "2026-12-02T18:00:00+05:30",
  end: "2026-12-03T05:00:00+05:30",
  timeZone: "Asia/Kolkata",
  celebrationDates: "1, 2 & 4 December 2026",
  rsvpDeadline: "30 October 2026",
  city: "Odisha",
  primaryVenue: "marriage",
  venues: [
    {
      id: "residence",
      name: "Groom’s Residence",
      purpose: "Thread ceremony · Wedding-day breakfast & lunch",
      address: "Please follow the exact location shared on Google Maps.",
      mapQuery: "20.842139,85.129827",
      mapsUrl: "https://maps.app.goo.gl/yYMJiG3vR6FQppgM9",
    },
    {
      id: "marriage",
      name: "Sunita Aangan",
      purpose: "Wedding ceremony · 2 December",
      address: "Jagatpur, Cuttack, Odisha",
      mapQuery: "20.4966751,85.9274134",
      mapsUrl: "https://maps.app.goo.gl/kuVFzMVT9Q6yqLRt9",
    },
    {
      id: "reception",
      name: "Crescent Convention Centre",
      purpose: "Grand Dinner · 4 December",
      address: "Please follow the exact location shared on Google Maps.",
      mapQuery: "20.8436538,85.1128962",
      mapsUrl: "https://maps.app.goo.gl/VFryEtyFjndNprsv8",
    },
  ],
  story: {
    text: "With hearts full of love and the blessings of our parents, we begin a new chapter together. Our wedding brings together two families, cherished Odia traditions, and the people who mean the most to us.",
    closing:
      "Your presence and blessings will make these celebrations all the more special. We look forward to welcoming you with our families.",
  },
  schedule: [
    {
      id: "thread-ceremony",
      title: "Thread Ceremony",
      start: "2026-12-01T06:00:00+05:30",
      end: "2026-12-01T17:00:00+05:30",
      venueId: "residence",
      text: "An auspicious beginning, with sacred rituals and the blessings of our loved ones.",
      meals: "Breakfast, lunch & dinner accompanied.",
      icon: "sun",
    },
    {
      id: "wedding",
      title: "Wedding",
      start: "2026-12-02T18:00:00+05:30",
      end: "2026-12-03T05:00:00+05:30",
      venueId: "marriage",
      text: "Join us as we celebrate our marriage in the warmth of Odia tradition.",
      meals: "Breakfast & lunch at Groom’s Residence. Dinner at Sunita Aangan.",
      icon: "rings",
    },
    {
      id: "grand-dinner",
      title: "Grand Dinner",
      start: "2026-12-04T19:00:00+05:30",
      end: "2026-12-05T00:00:00+05:30",
      venueId: "reception",
      text: "A joyful gathering of family and friends to celebrate our new beginning.",
      meals: "Meals for the day: breakfast, lunch & dinner.",
      icon: "gift",
    },
  ],
  details: [
    {
      title: "Celebrate in tradition",
      text: "We would love to see you in your favorite traditional attire. Come comfortably, and join us in the spirit of an Odia wedding.",
      icon: "sparkle",
    },
    {
      title: "Plan your visit",
      text: "Our celebrations take place at three locations. Please use the individual map links for the residence, marriage hall, and reception venue.",
      icon: "suitcase",
    },
    {
      title: "Come with your blessings",
      text: "Your presence, good wishes, and blessings are what will make our celebrations complete.",
      icon: "gift",
    },
  ],
  photos: {
    hero: {
      src: "assets/images/couple-1.webp",
      alt: "Aditya and Priti standing together in ivory outfits in a sunlit garden",
      position: "center 38%",
    },
    // Crops from the numbered source collages in couple-images/.
    gallery: [
      {
        src: "assets/images/couple-3-bottom-right.webp",
        alt: "Aditya and Priti standing together at a sunny mountain overlook",
        caption: "Under the same sky",
        width: 622,
        height: 622,
        fit: "contain",
      },
      /* Temporarily hidden; preserve this selection for reuse.
      {
        src: "assets/images/couple-4-top-right.webp",
        alt: "Aditya embracing Priti in her pink polo shirt",
        caption: "Our everyday kind of love",
        width: 622,
        height: 622,
        fit: "contain",
      },
      */
      /* Temporarily hidden; preserve this selection for reuse.
      {
        src: "assets/images/couple-4-bottom-right.webp",
        alt: "Aditya in green embracing Priti in a cream traditional outfit",
        caption: "Rooted in love",
        width: 622,
        height: 622,
        fit: "contain",
      },
      */
      {
        src: "assets/images/couple-7-bottom-right.webp",
        alt: "Priti in yellow leaning against Aditya at a restaurant table",
        caption: "Side by side",
        width: 622,
        height: 622,
        fit: "contain",
      },
      /* Temporarily hidden; preserve this selection for reuse.
      {
        src: "assets/images/couple-8-top-right.webp",
        alt: "Aditya and Priti sitting together on stone steps surrounded by greenery",
        caption: "So many more adventures ahead",
        width: 622,
        height: 622,
        fit: "contain",
      },
      */
      {
        src: "assets/images/couple-8-bottom-left.webp",
        alt: "Aditya and Priti silhouetted together on a large rock under the evening sky",
        caption: "Just us, and the horizon",
        width: 622,
        height: 622,
        fit: "contain",
      },
    ],
  },
  invitationPdf: "assets/invitation-aditya-priti.pdf",
  rsvp: {
    // Public Apps Script submission URL; the spreadsheet stays private.
    // The private guest sheet and its records are never published with this site.
    mode: "google-sheets",
    phone: "",
    phoneDisplay: "",
    email: "",
    endpoint:
      "https://script.google.com/macros/s/AKfycbxdNYu8vpSaDQMq-UNXXVUnI9ptc1UCT-vNegoecPXVD9UxjATsy76th8rLdc1AbsR5fg/exec",
    externalUrl: "",
    maxGuests: 4,
  },
  contacts: [
    {
      name: "Aditya & family",
      role: "For RSVPs, directions, and a little help with your plans",
      email: "",
      phone: "",
    },
  ],
  faqs: [
    {
      question: "Which dates should I keep free?",
      answer:
        "The Thread Ceremony is on 1 December, the Wedding is on 2 December and continues until 5:00 AM on 3 December, and the Grand Dinner is on 4 December 2026. The full program and each venue are listed above.",
    },
    {
      question: "Where are the wedding-day meals?",
      answer:
        "On 2 December, breakfast and lunch are at Groom’s Residence, and dinner is at Sunita Aangan, the marriage hall. Breakfast, lunch, and dinner accompany the Thread Ceremony and Grand Dinner celebrations.",
    },
    {
      question: "How do I find the venues?",
      answer:
        "Use the separate Google Maps links for Groom’s Residence, Sunita Aangan, and Crescent Convention Centre. For help, use the contact details shared with you privately.",
    },
    {
      question: "How and when should I RSVP?",
      answer:
        "Please let us know by 30 October 2026. Fill in your name, an email address or phone number, your attendance choice, and the number of people joining you, then select Submit. Dietary preferences and a message are optional. Your response is saved privately for the couple.",
    },
  ],
  hashtag: "#AdityaAndPriti",
};
