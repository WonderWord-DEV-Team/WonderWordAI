-- Seed content for the Child Home daily cards (goals + weekly challenges).
--
--   * daily_goals       -> 366 rows, one per day of the year
--   * weekly_challenges -> 53 rows, one per ISO week
--
-- Everything is static content: the app picks the row that matches the current
-- day/week, so each login day shows a different goal and challenge.

-- =============================================================================
-- 1. DAILY GOALS (366 days, built from a 40-goal rotation)
-- =============================================================================

WITH pool (idx, title, description, target_count, emoji) AS (
    VALUES
        (1,  'Warm-Up Reader',   'Finish 2 reading activities to warm up your brain!', 2, '📖'),
        (2,  'Story Starter',    'Complete 3 activities and start a brand-new story!', 3, '🌟'),
        (3,  'Word Hunter',      'Do 3 activities and hunt for tricky words!', 3, '🔍'),
        (4,  'Big Voice Day',    'Finish 4 activities using your biggest reading voice!', 4, '📣'),
        (5,  'Steady Reader',    'Complete 3 activities without rushing.', 3, '🐢'),
        (6,  'Curious Explorer', 'Finish 2 activities and explore a new word!', 2, '🧭'),
        (7,  'Sound Detective',  'Complete 3 activities and listen for every sound.', 3, '🕵️'),
        (8,  'Page Turner',      'Finish 4 activities in a row today!', 4, '📚'),
        (9,  'Brave Beginner',   'Complete 2 activities, even the tricky ones.', 2, '🦁'),
        (10, 'Rhythm Reader',    'Finish 3 activities and keep a steady beat.', 3, '🥁'),
        (11, 'Super Focus',      'Complete 4 activities with your best focus.', 4, '🎯'),
        (12, 'Story Builder',    'Finish 3 activities and build your own story.', 3, '🧱'),
        (13, 'Word Collector',   'Complete 3 activities and collect new words.', 3, '🎒'),
        (14, 'Smooth Reading',   'Finish 2 activities reading nice and smoothly.', 2, '🌊'),
        (15, 'Practice Power',   'Complete 5 activities — you can do it!', 5, '💪'),
        (16, 'Sunny Start',      'Finish 2 activities to start your day bright.', 2, '☀️'),
        (17, 'Question Time',    'Complete 3 activities and ask a question about each.', 3, '❓'),
        (18, 'Read and Retell',  'Finish 3 activities and retell your favourite part.', 3, '🗣️'),
        (19, 'Tricky Words',     'Complete 3 activities and beat one tricky word.', 3, '🧩'),
        (20, 'Champion Reader',  'Finish 5 activities like a reading champion!', 5, '🏆'),
        (21, 'Adventure Day',    'Complete 3 activities in a new story world.', 3, '🗺️'),
        (22, 'Slow and Clear',   'Finish 2 activities speaking slowly and clearly.', 2, '🎈'),
        (23, 'Listening Ears',   'Complete 3 activities and listen to every word.', 3, '👂'),
        (24, 'Picture Power',    'Finish 3 activities and picture the story in your head.', 3, '🖼️'),
        (25, 'Word Wizard',      'Complete 4 activities and cast a word spell!', 4, '🪄'),
        (26, 'Reading Rocket',   'Finish 3 activities and blast off!', 3, '🚀'),
        (27, 'Kind Practice',    'Complete 2 activities and be kind to yourself.', 2, '💛'),
        (28, 'Double Trouble',   'Finish 4 activities with two different stories.', 4, '✌️'),
        (29, 'Sound It Out',     'Complete 3 activities sounding out every part.', 3, '🔤'),
        (30, 'Story Chef',       'Finish 3 activities and mix up a tasty story.', 3, '🍳'),
        (31, 'Treasure Hunt',    'Complete 3 activities and find a treasure word.', 3, '💎'),
        (32, 'Steady Streak',    'Finish 2 activities to keep your streak alive.', 2, '🔥'),
        (33, 'Loud and Proud',   'Complete 3 activities using a proud voice.', 3, '🎤'),
        (34, 'Read Together',    'Finish 3 activities and share one with someone.', 3, '🤝'),
        (35, 'Word Garden',      'Complete 3 activities and grow your word garden.', 3, '🌱'),
        (36, 'Mystery Words',    'Finish 4 activities and solve a word mystery.', 4, '🔎'),
        (37, 'Calm Reader',      'Complete 2 activities with slow, calm breaths.', 2, '🌙'),
        (38, 'Big Finish',       'Finish 5 activities and end the day strong!', 5, '🎉'),
        (39, 'Try Again',        'Complete 3 activities and try one part twice.', 3, '🔁'),
        (40, 'Star Reader',      'Finish 4 activities and shine like a star.', 4, '⭐')
)
INSERT INTO public.daily_goals (day_of_year, title, description, target_count, unit, emoji)
SELECT
    d::SMALLINT,
    pool.title,
    pool.description,
    pool.target_count::SMALLINT,
    'activities',
    pool.emoji
FROM generate_series(1, 366) AS d
JOIN pool ON pool.idx = ((d - 1) % 40) + 1
ON CONFLICT (day_of_year) DO NOTHING;

-- =============================================================================
-- 2. WEEKLY CHALLENGES (53 ISO weeks)
-- =============================================================================

INSERT INTO public.weekly_challenges (week_of_year, title, description, xp_reward, cta_label, cta_href, story_theme)
VALUES
    (1,  'Space Cadet',        'Read 1 Space story from start to finish — earn 50 XP!', 50, 'Try it!', '/child', 'space'),
    (2,  'Word Explorer Week', 'Look up 5 brand-new words in Word Explorer — earn 60 XP!', 60, 'Explore!', '/explorer', NULL),
    (3,  'Dino Discovery',     'Finish a Dinos story without getting stuck — earn 50 XP!', 50, 'Try it!', '/child', 'dinos'),
    (4,  'Read Aloud Star',    'Read aloud on 3 different days this week — earn 70 XP!', 70, 'Read it!', '/read-aloud', NULL),
    (5,  'Fairy Tale Quest',   'Complete 1 Fairy Tale story from beginning to end — earn 50 XP!', 50, 'Try it!', '/child', 'fairy tale'),
    (6,  'Word Vision Week',   'Turn 3 words into pictures with Word Vision — earn 60 XP!', 60, 'See it!', '/vision', NULL),
    (7,  'Hero Training',      'Read 2 Heroes stories this week — earn 80 XP!', 80, 'Try it!', '/child', 'heroes'),
    (8,  'Tasty Words',        'Finish a Food story and name 3 new words — earn 55 XP!', 55, 'Try it!', '/child', 'food'),
    (9,  'Animal Friends',     'Read 1 Animals story out loud — earn 50 XP!', 50, 'Try it!', '/child', 'animals'),
    (10, 'Smooth Reader',      'Read aloud 3 times without long pauses — earn 65 XP!', 65, 'Read it!', '/read-aloud', NULL),
    (11, 'Rocket Words',       'Snap a worksheet and finish the Space story it makes — earn 60 XP!', 60, 'Try it!', '/child', 'space'),
    (12, 'Meaning Master',     'Find the meaning of 4 tricky words — earn 60 XP!', 60, 'Explore!', '/explorer', NULL),
    (13, 'Dino Double',        'Finish 2 Dinos stories this week — earn 80 XP!', 80, 'Try it!', '/child', 'dinos'),
    (14, 'Picture This',       'Make 4 word pictures with Word Vision — earn 70 XP!', 70, 'See it!', '/vision', NULL),
    (15, 'Castle Climb',       'Read 2 Fairy Tale stories this week — earn 80 XP!', 80, 'Try it!', '/child', 'fairy tale'),
    (16, 'Brave Voice',        'Read aloud a whole page without stopping — earn 60 XP!', 60, 'Read it!', '/read-aloud', NULL),
    (17, 'Super Squad',        'Finish a Heroes story and retell it to someone — earn 65 XP!', 65, 'Try it!', '/child', 'heroes'),
    (18, 'Snack-Size Words',   'Learn 5 new food words in Word Explorer — earn 60 XP!', 60, 'Explore!', '/explorer', NULL),
    (19, 'Safari Reader',      'Read 2 Animals stories this week — earn 80 XP!', 80, 'Try it!', '/child', 'animals'),
    (20, 'Sound Sleuth',       'Read aloud and fix 3 tricky sounds — earn 70 XP!', 70, 'Read it!', '/read-aloud', NULL),
    (21, 'Moon Landing',       'Finish a Space story with no help — earn 60 XP!', 60, 'Try it!', '/child', 'space'),
    (22, 'Word Painter',       'Turn 5 words into pictures — earn 75 XP!', 75, 'See it!', '/vision', NULL),
    (23, 'Fossil Finder',      'Find the meaning of 3 dinosaur words — earn 55 XP!', 55, 'Explore!', '/explorer', NULL),
    (24, 'Story Marathon',     'Finish 3 stories from any world — earn 90 XP!', 90, 'Try it!', '/child', NULL),
    (25, 'Magic Words',        'Read a Fairy Tale story out loud — earn 60 XP!', 60, 'Try it!', '/child', 'fairy tale'),
    (26, 'Halfway Hero',       'Read aloud on 4 days this week — earn 85 XP!', 85, 'Read it!', '/read-aloud', NULL),
    (27, 'Summer Explorer',    'Look up 6 new words this week — earn 75 XP!', 75, 'Explore!', '/explorer', NULL),
    (28, 'Recipe for Reading', 'Finish 2 Food stories this week — earn 80 XP!', 80, 'Try it!', '/child', 'food'),
    (29, 'Jungle Journey',     'Finish an Animals story and name every animal — earn 65 XP!', 65, 'Try it!', '/child', 'animals'),
    (30, 'Star Gazer',         'Read 2 Space stories this week — earn 80 XP!', 80, 'Try it!', '/child', 'space'),
    (31, 'Vision Quest',       'Make 3 word pictures and read each word aloud — earn 70 XP!', 70, 'See it!', '/vision', NULL),
    (32, 'Loud and Clear',     'Read aloud with your biggest voice 3 times — earn 65 XP!', 65, 'Read it!', '/read-aloud', NULL),
    (33, 'Dino Detective',     'Finish a Dinos story and answer every question — earn 60 XP!', 60, 'Try it!', '/child', 'dinos'),
    (34, 'Back to Books',      'Finish 3 stories from any world — earn 90 XP!', 90, 'Try it!', '/child', NULL),
    (35, 'Hero Handbook',      'Look up 4 hero words in Word Explorer — earn 60 XP!', 60, 'Explore!', '/explorer', NULL),
    (36, 'Kitchen Tales',      'Read a Food story out loud — earn 55 XP!', 55, 'Try it!', '/child', 'food'),
    (37, 'Autumn Animals',     'Finish 2 Animals stories this week — earn 80 XP!', 80, 'Try it!', '/child', 'animals'),
    (38, 'Word Builder',       'Turn 4 tricky words into pictures — earn 70 XP!', 70, 'See it!', '/vision', NULL),
    (39, 'Fairy Finale',       'Finish a Fairy Tale story without getting stuck — earn 60 XP!', 60, 'Try it!', '/child', 'fairy tale'),
    (40, 'Reading Streak',     'Read aloud 5 days in a row — earn 100 XP!', 100, 'Read it!', '/read-aloud', NULL),
    (41, 'Galaxy Gang',        'Finish a Space story and retell the ending — earn 65 XP!', 65, 'Try it!', '/child', 'space'),
    (42, 'Mystery Meaning',    'Find the meaning of 5 mystery words — earn 70 XP!', 70, 'Explore!', '/explorer', NULL),
    (43, 'Hero Marathon',      'Read 2 Heroes stories this week — earn 80 XP!', 80, 'Try it!', '/child', 'heroes'),
    (44, 'Spooky Sounds',      'Read aloud and nail 4 tricky sounds — earn 75 XP!', 75, 'Read it!', '/read-aloud', NULL),
    (45, 'Dino Dash',          'Finish a Dinos story in one sitting — earn 60 XP!', 60, 'Try it!', '/child', 'dinos'),
    (46, 'Word Feast',         'Learn 6 new words this week — earn 80 XP!', 80, 'Explore!', '/explorer', NULL),
    (47, 'Thankful Tales',     'Finish a Food story and share it with someone — earn 65 XP!', 65, 'Try it!', '/child', 'food'),
    (48, 'Winter Wildlife',    'Read an Animals story out loud — earn 55 XP!', 55, 'Try it!', '/child', 'animals'),
    (49, 'Picture Party',      'Make 5 word pictures this week — earn 75 XP!', 75, 'See it!', '/vision', NULL),
    (50, 'Snow Story',         'Finish a Fairy Tale story out loud — earn 60 XP!', 60, 'Try it!', '/child', 'fairy tale'),
    (51, 'Holiday Heroes',     'Finish 2 Heroes stories this week — earn 85 XP!', 85, 'Try it!', '/child', 'heroes'),
    (52, 'Year-End Voyage',    'Read 3 stories from 3 different worlds — earn 100 XP!', 100, 'Try it!', '/child', NULL),
    (53, 'Bonus Blast Off',    'Read aloud every day this week — earn 120 XP!', 120, 'Read it!', '/read-aloud', NULL)
ON CONFLICT (week_of_year) DO NOTHING;
