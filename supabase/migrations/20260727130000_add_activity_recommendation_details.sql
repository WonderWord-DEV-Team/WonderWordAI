-- Add richer structured content to activity_recommendations so the parent
-- dashboard's Playful Practice activity modal can render "what you'll need",
-- "what this teaches", and numbered step-by-step instructions.
-- ticket: integrate playful practice recommendations into parent dashboard

ALTER TABLE public.activity_recommendations
    ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 10,
    ADD COLUMN IF NOT EXISTS materials         JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS example_words     TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS steps             JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.activity_recommendations.materials IS
    'Array of {"icon": string, "label": string} objects shown in the "What you''ll need" section.';
COMMENT ON COLUMN public.activity_recommendations.steps IS
    'Array of {"title": string, "description": string} objects shown in the "Step-by-step" section, in order.';

UPDATE public.activity_recommendations
SET
    title = 'Shadow Puppets SH Game',
    duration_minutes = 10,
    materials = '[
        {"icon": "lamp", "label": "Lamp or torch"},
        {"icon": "wall", "label": "A plain white wall"},
        {"icon": "hand", "label": "Your hands"},
        {"icon": "sheet", "label": "This activity sheet"}
    ]'::jsonb,
    example_words = ARRAY['ship', 'shell', 'shout', 'fish', 'wish'],
    steps = '[
        {"title": "Set the scene", "description": "Darken the room and shine a lamp at a plain white wall. The bigger the light, the bigger the shadows!"},
        {"title": "Make your puppet", "description": "Hold your hands in front of the light to make a shadow puppet - a duck, rabbit, or any animal shape."},
        {"title": "Say the SH words", "description": "Every time the puppet \"speaks,\" say a SH word together. Start slow: sh... sh... SHIP! Then try shout, shell, fish, wish."},
        {"title": "Make it a game", "description": "Take turns - parent makes the puppet, child says the word. Who can say the most SH words in 30 seconds?"},
        {"title": "Make up a silly sentence", "description": "Try: The shy fish wished for a shiny shell! How many SH words can you fit in one sentence?"}
    ]'::jsonb
WHERE phonics_category = 'sh-digraph';

UPDATE public.activity_recommendations
SET
    duration_minutes = 12,
    materials = '[
        {"icon": "dough", "label": "Playdough or real dough"},
        {"icon": "board", "label": "A flat surface or board"},
        {"icon": "card", "label": "Word cards (optional)"}
    ]'::jsonb,
    example_words = ARRAY['cake', 'bake', 'gate', 'plate', 'skate'],
    steps = '[
        {"title": "Roll it out", "description": "Roll playdough or real dough into long, thin ropes - like spaghetti!"},
        {"title": "Shape a word", "description": "Pick a long-a word (cake, bake, gate) and shape the dough into each letter."},
        {"title": "Stretch the sound", "description": "Say the word slowly, stretching the middle \"a\" sound like a super-stretchy rubber band: baaaake."},
        {"title": "Race the clock", "description": "See how many long-a words you can shape and say together in two minutes."},
        {"title": "Taste test (optional)", "description": "If it is real dough, bake your favorite shape and say the word one more time before eating it."}
    ]'::jsonb
WHERE phonics_category = 'long-a';

UPDATE public.activity_recommendations
SET
    duration_minutes = 8,
    materials = '[
        {"icon": "bowl", "label": "A bowl or pot to drum on"},
        {"icon": "spoon", "label": "A wooden spoon"},
        {"icon": "book", "label": "A book or homework sheet"}
    ]'::jsonb,
    example_words = ARRAY['dinosaur', 'butterfly', 'computer', 'umbrella'],
    steps = '[
        {"title": "Grab a drum", "description": "Turn a bowl or pot upside down and grab a wooden spoon."},
        {"title": "Pick a big word", "description": "Find a long word from a book or homework sheet, like dinosaur."},
        {"title": "Clap the syllables", "description": "Say the word slowly and drum once for every syllable: di-no-saur equals 3 beats!"},
        {"title": "Count together", "description": "Count the drum beats out loud together and say the total number of syllables."},
        {"title": "Beat the record", "description": "Find the longest word you can and see how many beats it takes to say it."}
    ]'::jsonb
WHERE phonics_category = 'multisyllabic';

UPDATE public.activity_recommendations
SET
    duration_minutes = 10,
    materials = '[
        {"icon": "lamp", "label": "A flashlight"},
        {"icon": "card", "label": "Sight word cards"},
        {"icon": "tape", "label": "Tape"}
    ]'::jsonb,
    example_words = ARRAY['said', 'where', 'people', 'could'],
    steps = '[
        {"title": "Set up the wall", "description": "Tape sight word cards onto a dark wall or door."},
        {"title": "Dim the lights", "description": "Turn off the lights so the flashlight beam stands out."},
        {"title": "Call a word", "description": "Say a word out loud and have the child scan the wall for it."},
        {"title": "Tag it fast", "description": "The child shines the flashlight on the matching card as quickly as they can."},
        {"title": "Switch roles", "description": "Let the child call out words for you to tag - turnabout keeps it fun."}
    ]'::jsonb
WHERE phonics_category = 'sight-words';

UPDATE public.activity_recommendations
SET
    duration_minutes = 10,
    materials = '[
        {"icon": "card", "label": "Soft C word cards"},
        {"icon": "home", "label": "Any room to hide cards in"}
    ]'::jsonb,
    example_words = ARRAY['city', 'circle', 'cent', 'fence'],
    steps = '[
        {"title": "Hide the cards", "description": "Hide soft C word cards (city, circle, cent) around a room."},
        {"title": "Explain the mission", "description": "Tell the child they are a detective collecting secret soft C words."},
        {"title": "Whisper to collect", "description": "To pick up a card, the child must whisper the soft C sound so guards cannot hear."},
        {"title": "Build the case file", "description": "Line up the collected cards and read each word together."},
        {"title": "Crack the code", "description": "Talk about what soft C words have in common - the letter after the C."}
    ]'::jsonb
WHERE phonics_category = 'soft-c';
