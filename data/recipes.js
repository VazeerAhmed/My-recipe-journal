/* ============================================================
   MOM'S RECIPE JOURNAL — the recipe book itself.

   This is the ONLY file you edit to add a recipe.
   Copy one block, paste it into the list, change the words, save.
   (See README.md for the field-by-field guide.)

   ------------------------------------------------------------
   TEMPLATE — copy from here
   ------------------------------------------------------------
   {
     id: "short-name-no-spaces",
     title: "The Recipe Name",
     subtitle: "",                       // optional one-liner
     category: "breakfast",              // breakfast | lunch | dinner | treats
     rating: 5,                          // 0–5 stars
     difficulty: 2,                      // 1–5 dots
     portions: 4,
     diet: { vegetarian: true, vegan: false, glutenFree: false, dairyFree: false },
     prep: { hrs: 0, mins: 20 },
     cook: { hrs: 0, mins: 30 },
     ingredients: [
       "2 cups flour",                   // start each line with the amount
       "1 tsp salt"                      // so the portion scaler can work
     ],
     method: [
       "First step.",
       "Second step."
     ],
     hints: "Hints, tips & tricks box from her notebook.",
     goesWith: "Goes great with box from her notebook.",
     notes: "Anything she said that you never want to forget.",
     addedOn: "2026-08-31",              // YYYY-MM-DD
     media: {
       images: [{ src: "media/images/name-1.jpg", caption: "" }],
       videos: [{ src: "media/videos/name.mp4",  caption: "" }],   // a YouTube link works too
       audio:  [{ src: "media/audio/name.m4a",   caption: "" }]    // her voice messages
     }
   },
   ------------------------------------------------------------
   to here.

   The four entries below are EXAMPLES so the site isn't empty —
   delete them once Mom's real recipes are in.
   ============================================================ */

window.RECIPES = [

  /* ---------------------------- BREAKFAST ---------------------------- */
  {
    id: "aloo-paratha",
    title: "Aloo Paratha",
    subtitle: "Sunday morning, flour on every surface",
    category: "breakfast",
    rating: 5,
    difficulty: 2,
    portions: 4,
    diet: { vegetarian: true, vegan: false, glutenFree: false, dairyFree: false },
    prep: { hrs: 0, mins: 30 },
    cook: { hrs: 0, mins: 20 },
    ingredients: [
      "2 cups wheat flour",
      "3/4 cup warm water",
      "1 tsp salt",
      "4 potatoes, boiled and mashed",
      "1 green chilli, finely chopped",
      "1 tsp cumin seeds",
      "1/2 tsp red chilli powder",
      "2 tbsp coriander leaves, chopped",
      "4 tbsp ghee, for the pan"
    ],
    method: [
      "Knead the flour, salt and warm water into a soft dough. Cover it and let it rest for 20 minutes.",
      "Mash the boiled potatoes while still warm and mix in the chilli, cumin, chilli powder, salt and coriander.",
      "Divide the dough and the filling into equal balls — the filling ball slightly smaller than the dough ball.",
      "Flatten a dough ball, place the filling in the centre, gather the edges over it and press closed.",
      "Roll out gently, dusting with flour, until it is about the size of your palm spread wide.",
      "Cook on a hot tawa, turning once, then spoon ghee around the edges and press until both sides are golden.",
      "Serve straight off the pan — they are never as good five minutes later."
    ],
    hints: "Rest the dough. That is the whole secret. And mash the potatoes while they are warm or you will get lumps that tear the paratha.",
    goesWith: "Thick curd, a spoon of white butter, mango pickle and very hot chai.",
    notes: "She never measures the water — she just says the dough should feel like your earlobe.",
    addedOn: "2026-08-28",
    media: {
      images: [],
      videos: [],
      audio: []
    }
  },

  /* ------------------------------ LUNCH ------------------------------ */
  {
    id: "rajma-chawal",
    title: "Rajma Chawal",
    subtitle: "The afternoon plate that puts everyone to sleep",
    category: "lunch",
    rating: 5,
    difficulty: 3,
    portions: 6,
    diet: { vegetarian: true, vegan: true, glutenFree: true, dairyFree: true },
    prep: { hrs: 8, mins: 0 },
    cook: { hrs: 1, mins: 0 },
    ingredients: [
      "2 cups rajma (kidney beans), soaked overnight",
      "2 onions, finely chopped",
      "3 tomatoes, pureed",
      "1 tbsp ginger garlic paste",
      "2 tsp coriander powder",
      "1 tsp cumin powder",
      "1/2 tsp turmeric",
      "1 tsp garam masala",
      "3 tbsp oil",
      "2 cups basmati rice, to serve"
    ],
    method: [
      "Drain the soaked rajma and pressure cook with fresh water and salt until it mashes easily between two fingers.",
      "Heat the oil and fry the onions slowly until deep brown — this is the step that decides the colour of the whole dish.",
      "Add the ginger garlic paste and cook until it stops smelling raw.",
      "Add the tomato puree and the dry spices, and cook until the oil separates at the edges.",
      "Tip in the rajma along with its cooking water and simmer, uncovered, for at least 20 minutes.",
      "Mash a ladleful of the beans against the side of the pot to thicken the gravy.",
      "Finish with garam masala and rest it off the heat for 10 minutes before serving over hot rice."
    ],
    hints: "Never throw away the water the rajma cooked in — that is where all the flavour went. Cook the onions longer than you think is necessary.",
    goesWith: "Plain basmati rice, sliced onion with lemon, and a spoon of pickle on the side.",
    notes: "Always better the next day. She makes double on purpose.",
    addedOn: "2026-08-27",
    media: { images: [], videos: [], audio: [] }
  },

  /* ------------------------------ DINNER ----------------------------- */
  {
    id: "chicken-curry",
    title: "Mom's Chicken Curry",
    subtitle: "The one everyone asks for by name",
    category: "dinner",
    rating: 5,
    difficulty: 3,
    portions: 4,
    diet: { vegetarian: false, vegan: false, glutenFree: true, dairyFree: false },
    prep: { hrs: 0, mins: 25 },
    cook: { hrs: 0, mins: 45 },
    ingredients: [
      "1 kg chicken, on the bone",
      "3 onions, thinly sliced",
      "1/2 cup yoghurt, whisked",
      "2 tomatoes, chopped",
      "2 tbsp ginger garlic paste",
      "2 tsp red chilli powder",
      "1 tsp turmeric",
      "2 tsp coriander powder",
      "1 tsp garam masala",
      "4 tbsp oil",
      "1 handful coriander leaves"
    ],
    method: [
      "Marinate the chicken with yoghurt, turmeric, chilli powder and salt for at least 30 minutes.",
      "Fry the sliced onions in hot oil until golden brown, then add the ginger garlic paste.",
      "Add the tomatoes and cook them down until completely soft.",
      "Add the marinated chicken and fry on high heat for 8–10 minutes so it browns rather than boils.",
      "Add a cup of hot water, cover, and simmer on low until the chicken is falling off the bone.",
      "Uncover and reduce the gravy to the thickness you like.",
      "Finish with garam masala and a handful of coriander leaves, lid back on, off the heat."
    ],
    hints: "High heat first, low heat after. If you add the water too early the chicken boils instead of browning and the gravy stays thin.",
    goesWith: "Hot rotis, jeera rice, and a raw onion salad with lemon.",
    notes: "She adds one extra green chilli 'for the smell, not the heat'.",
    addedOn: "2026-08-26",
    media: { images: [], videos: [], audio: [] }
  },

  /* ------------------------------ TREATS ----------------------------- */
  {
    id: "besan-ladoo",
    title: "Besan Ladoo",
    subtitle: "Festival tin, hidden on the top shelf",
    category: "treats",
    rating: 4,
    difficulty: 2,
    portions: 20,
    diet: { vegetarian: true, vegan: false, glutenFree: true, dairyFree: false },
    prep: { hrs: 0, mins: 10 },
    cook: { hrs: 0, mins: 30 },
    ingredients: [
      "2 cups besan (gram flour)",
      "1 cup ghee",
      "1 cup powdered sugar",
      "1 tsp cardamom powder",
      "2 tbsp almonds, chopped"
    ],
    method: [
      "Melt the ghee in a heavy pan and add the besan.",
      "Roast on low heat, stirring without stopping, for 20–25 minutes until it turns a shade darker and smells nutty.",
      "Take it off the heat and let it cool until it is just warm to the touch.",
      "Mix in the powdered sugar, cardamom and almonds.",
      "Roll into balls while the mixture is still warm and soft.",
      "Let them set completely before stacking them in the tin."
    ],
    hints: "Low heat and never stop stirring. If you add the sugar while it is hot the ladoos will not hold their shape.",
    goesWith: "A tin that lives on the top shelf and a glass of milk.",
    notes: "Made every Diwali. The first one is always broken 'to check'.",
    addedOn: "2026-08-25",
    media: { images: [], videos: [], audio: [] }
  }

];
