export const KANO_ROUTES = [
  // Commercial & Central Hubs
  { id: 1, name: "Sabon Gari Market ➔ Bata Junction", distanceKm: 4.2, baseFare: 300, minLevel: 1 },
  { id: 2, name: "Kofar Nasarawa ➔ State Road / Government House", distanceKm: 5.0, baseFare: 400, minLevel: 1 },
  { id: 3, name: "Farm Centre ➔ Silverbird / Trade Fair", distanceKm: 3.5, baseFare: 250, minLevel: 1 },
  { id: 4, name: "Kano Central Mosque ➔ Kofar Mata Dye Pits", distanceKm: 2.8, baseFare: 200, minLevel: 1 },
  { id: 5, name: "France Road ➔ Igbo Road / Sabon Gari", distanceKm: 3.1, baseFare: 250, minLevel: 1 },

  // Residential & Major Arterials
  { id: 6, name: "Gidan Rumfa (Emir's Palace) ➔ Shahuchi", distanceKm: 2.1, baseFare: 150, minLevel: 2 },
  { id: 7, name: "Kano State University (KUST Wudil Road) ➔ Tarauni", distanceKm: 8.5, baseFare: 600, minLevel: 2 },
  { id: 8, name: "Bayero University Kano (BUK Old Campus) ➔ New Campus", distanceKm: 11.0, baseFare: 800, minLevel: 2 },
  { id: 9, name: "Goron Dutse ➔ Dawanau International Grain Market", distanceKm: 14.2, baseFare: 1200, minLevel: 3 },
  { id: 10, name: "Gwarzo Road ➔ Kabuga Bus Stop", distanceKm: 6.0, baseFare: 450, minLevel: 3 },

  // High Density Terminals
  { id: 11, name: "Kafin Maiyaki ➔ Zaria Road Junction", distanceKm: 7.2, baseFare: 550, minLevel: 3 },
  { id: 12, name: "Yankaba Motor Park ➔ Hadejia Road", distanceKm: 9.1, baseFare: 700, minLevel: 4 },
  { id: 13, name: "Hotoro Ring Road ➔ Maiduguri Road Roundabout", distanceKm: 10.5, baseFare: 850, minLevel: 4 },
  { id: 14, name: "Gwagwarwa ➔ Brigade Bus Stop", distanceKm: 4.8, baseFare: 350, minLevel: 4 },
  { id: 15, name: "Tudun Wada ➔ Sharada Industrial Area", distanceKm: 6.5, baseFare: 500, minLevel: 5 },

  // Industrial & Outskirts
  { id: 16, name: "Challawa Industrial Zone ➔ Panshekara", distanceKm: 12.0, baseFare: 950, minLevel: 5 },
  { id: 17, name: "Kumbotso Local Govt ➔ Mariri Junction", distanceKm: 13.5, baseFare: 1100, minLevel: 5 },
  { id: 18, name: "Mallam Aminu Kano International Airport (MAKIA) ➔ Nomansland", distanceKm: 7.8, baseFare: 750, minLevel: 6 },
  { id: 19, name: "Kurna Asabe ➔ Katsina Road Expressway", distanceKm: 8.2, baseFare: 650, minLevel: 6 },
  { id: 20, name: "Bichi Road Junction ➔ Rijiyar Lemo", distanceKm: 9.5, baseFare: 750, minLevel: 6 },

  // Routes 21 through 50
  { id: 21, name: "Dorayi Karama ➔ BUK Small Gate", distanceKm: 3.8, baseFare: 300, minLevel: 7 },
  { id: 22, name: "Kano Zoo Road ➔ Ado Bayero Mall", distanceKm: 2.5, baseFare: 200, minLevel: 7 },
  { id: 23, name: "Gyadi-Gyadi ➔ Court Road", distanceKm: 4.0, baseFare: 300, minLevel: 7 },
  { id: 24, name: "Kano Line Motor Park ➔ Unguwa Uku", distanceKm: 5.5, baseFare: 400, minLevel: 8 },
  { id: 25, name: "Tashar Kano ➔ Naibawa Flyover", distanceKm: 6.8, baseFare: 500, minLevel: 8 },
  { id: 26, name: "Murtala Muhammad Specialist Hospital ➔ Kofar Ruwa", distanceKm: 4.5, baseFare: 350, minLevel: 8 },
  { id: 27, name: "Kofar Mazugal ➔ Gwammaja", distanceKm: 3.2, baseFare: 250, minLevel: 9 },
  { id: 28, name: "Dakata Small Scale ➔ Custom Roundabout", distanceKm: 5.1, baseFare: 400, minLevel: 9 },
  { id: 29, name: "Sabuwar Kofa ➔ Kofar Gadon Kaya", distanceKm: 3.9, baseFare: 300, minLevel: 9 },
  { id: 30, name: "Gadan Loko ➔ Sharada Phase 2", distanceKm: 6.1, baseFare: 450, minLevel: 10 },
  { id: 31, name: "Kano State Polytechnic ➔ BUK Road", distanceKm: 4.7, baseFare: 350, minLevel: 10 },
  { id: 32, name: "Aminu Kano Teaching Hospital (AKTH) ➔ Zaria Road", distanceKm: 5.3, baseFare: 400, minLevel: 10 },
  { id: 33, name: "Gandun Albasa ➔ Zoo Road Roundabout", distanceKm: 3.0, baseFare: 250, minLevel: 11 },
  { id: 34, name: "Kofar Dawanau ➔ Katsina Bypass", distanceKm: 11.5, baseFare: 900, minLevel: 11 },
  { id: 35, name: "Yan Katako Market ➔ Sabon Gari Extension", distanceKm: 2.9, baseFare: 200, minLevel: 11 },
  { id: 36, name: "Rimin Kebe ➔ Kawaji", distanceKm: 4.3, baseFare: 300, minLevel: 12 },
  { id: 37, name: "Yadakunya Leprosy Hospital ➔ Dawakin Tofa Junction", distanceKm: 15.0, baseFare: 1300, minLevel: 12 },
  { id: 38, name: "Kofar Kansakali ➔ Dan Agundi", distanceKm: 3.6, baseFare: 250, minLevel: 12 },
  { id: 39, name: "Gwarzo Bypass ➔ Kabuga Housing Estate", distanceKm: 5.8, baseFare: 450, minLevel: 13 },
  { id: 40, name: "Jangaru ➔ Sallari", distanceKm: 4.9, baseFare: 350, minLevel: 13 },
  { id: 41, name: "Badawa Layout ➔ Badawa Bus Stop", distanceKm: 2.7, baseFare: 200, minLevel: 13 },
  { id: 42, name: "Gidan Murtala ➔ Post Office Road", distanceKm: 1.8, baseFare: 150, minLevel: 14 },
  { id: 43, name: "Kofar Wambai ➔ Plastic Market", distanceKm: 2.2, baseFare: 200, minLevel: 14 },
  { id: 44, name: "Yan Kaba ➔ Hadejia Road Depot", distanceKm: 7.0, baseFare: 550, minLevel: 14 },
  { id: 45, name: "Danbare ➔ BUK New Gate", distanceKm: 3.3, baseFare: 250, minLevel: 15 },
  { id: 46, name: "Garo Town Junction ➔ Gwarzo Highway", distanceKm: 16.5, baseFare: 1500, minLevel: 15 },
  { id: 47, name: "Kafin Agur ➔ Madobi Road", distanceKm: 12.8, baseFare: 1000, minLevel: 15 },
  { id: 48, name: "Sani Abacha Stadium ➔ Kofar Nuhu", distanceKm: 3.1, baseFare: 250, minLevel: 16 },
  { id: 49, name: "Kano Club ➔ Bompai Road", distanceKm: 4.0, baseFare: 300, minLevel: 16 },
  { id: 50, name: "Kofar Na'isa ➔ Sharada Flyover", distanceKm: 5.0, baseFare: 400, minLevel: 16 }
];