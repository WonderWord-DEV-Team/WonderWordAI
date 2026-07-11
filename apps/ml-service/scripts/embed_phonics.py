
def get_phonics_knowledge():
    return {
        "phonics_knowledge": phonics_knowledge,
    }


#contains the phonics_knowledge

phonics_knowledge = [

    #Kindergarten Phonics (4 rules): short-a, short-i, short-o, short-u
    {
        "id": "short-a-1",
        "category": "short-a",
        "text": "short-a: short vowel A sound in cat, map, sat, bag, fan, cap",
        "phonics_rule": "Short A makes the /a/ sound as in 'cat'. It appears in simple CVC words (consonant-vowel-consonant) and is the first vowel sound children learn.",
        "example_words": ["cat", "map", "sat", "bag", "fan", "cap", "hat", "rat", "man", "pan"]
    },
    {
        "id": "short-e-1",
        "category": "short-e",
        "text": "short-e: short vowel E sound in bed, red, leg, men, ten, pet, hen, wet, set, net",
        "phonics_rule": "Short E makes the /e/ sound as in 'bed'. It appears in simple CVC words (consonant-vowel-consonant) and is the second vowel sound children learn.",
        "example_words": ["bed", "red", "leg", "men", "ten", "pet", "hen", "wet", "set", "net"]
    },
    {
        "id": "short-i-1",
        "category": "short-i",
        "text": "short-i: short vowel I sound in sit, hit, bit, lid, kid, pig, win, pin, tin, fin",
        "phonics_rule": "Short I makes the /ih/ sound as in 'sit'. It appears in simple CVC words (consonant-vowel-consonant) and is the third vowel sound children learn.",
        "example_words": ["sit", "hit", "bit", "lid", "kid", "pig", "win", "pin", "tin", "fin"]
    },
    {
        "id": "short-o-1",
        "category": "short-o",
        "text": "short-o: short vowel O sound in hot, dog, top, box, pot, hop, mop, pop, cop",
        "phonics_rule": "Short O makes the /aa/ sound as in 'hot'. It appears in simple CVC words (consonant-vowel-consonant) and is the fourth vowel sound children learn.",
        "example_words": ["hot", "dog", "top", "box", "pot", "hop", "mop", "pop", "cop"]
    },
    {
        "id": "short-u-1",
        "category": "short-u",
        "text": "short-u: short vowel U sound in sun, run, fun, cup, tub, rub, hug, bug, jug",
        "phonics_rule": "Short U makes the /uh/ sound as in 'sun'. It appears in simple CVC words (consonant-vowel-consonant) and is the fifth vowel sound children learn.",
        "example_words": ["sun", "run", "fun", "cup", "tub", "rub", "hug", "bug", "jug"]
    },

    #First Grade Phonics (8 rules): sh-digraph, ch-digraph, th-digraph, wh-digraph, ph-digraph, ck-digraph, bl-blend, cr-blend
    {
        "id": "sh-1",
        "category": "sh-digraph",
        "text": "sh-digraph: SH sound in ship, fish, brush, shell, wish",
        "phonics_rule": "SH is a consonant digraph — two letters S and H that together make one sound /sh/. The individual S and H sounds disappear completely.",
        "example_words": ["ship", "fish", "brush", "shell", "wish"]
    },
    {
        "id": "ch-1",
        "category": "ch-digraph",
        "text": "ch-digraph: CH sound in chip, much, chair, check, peach",
        "phonics_rule": "CH is a consonant digraph — two letters C and H that together make one sound /ch/. Common at the start and end of words.",
        "example_words": ["chip", "much", "chair", "check", "peach"]
    },
    {
        "id": "th-1",
        "category": "th-digraph",
        "text": "th-digraph: TH sound in this, that, with, them, think",
        "phonics_rule": "TH is a consonant digraph with two sounds — voiced /th/ as in 'this' and unvoiced /th/ as in 'think'. Tongue touches upper teeth.",
        "example_words": ["this", "that", "with", "them", "think"]
    },
    {
        "id": "wh-1",
        "category": "wh-digraph",
        "text": "wh-digraph: WH sound in what, when, where, who, why",
        "phonics_rule": "WH is a consonant digraph — two letters W and H that together make one sound /wh/. The individual W and H sounds disappear completely.",
        "example_words": ["what", "when", "where", "who", "why"]
    },
    {
        "id": "ph-1",
        "category": "ph-digraph",
        "text": "ph-digraph: PH sound in phone, photo, phrase, trophy, phantom",
        "phonics_rule": "PH is a consonant digraph — two letters P and H that together make one sound /f/. The individual P and H sounds disappear completely.",
        "example_words": ["phone", "photo", "phrase", "trophy", "phantom"]
    },
    {
        "id": "ck-1",
        "category": "ck-digraph",
        "text": "ck-digraph: CK sound in lock, pack, sack, track, truck",
        "phonics_rule": "CK is a consonant digraph — two letters C and K that together make one sound /k/. The individual C and K sounds disappear completely.",
        "example_words": ["lock", "pack", "sack", "track", "truck"]
    },
    {
        "id": "bl-1",
        "category": "bl-blend",
        "text": "bl-blend: BL sound in black, blue, blind, block, blow",
        "phonics_rule": "BL is a consonant blend — two letters B and L that together make one sound /bl/.",
        "example_words": ["black", "blue", "blind", "block", "blow"]
    },
    {
        "id": "cr-1",
        "category": "cr-blend",
        "text": "cr-blend: CR sound in crate, cream, crash, crew, cry",
        "phonics_rule": "CR is a consonant blend — two letters C and R that together make one sound /cr/.",
        "example_words": ["crate", "cream", "crash", "crew", "cry"]
    },

    #Second Grade Phonics(6 rules): long-a, long-i, long-o, vowel-team-ai, vowel-team-ee, vowel-team-oa, vowel-team-oo
    {
        "id": "long-a-1",
        "category": "long-a",
        "text": "long-a: silent-e pattern in cake, bake, gate, name, same",
        "phonics_rule": "Long A uses the silent-e pattern (a_e) — the final E is silent but makes the A say its name /ay/. Remove the E and the vowel goes short.",
        "example_words": ["cake", "bake", "gate", "name", "same"]
    },
    {
        "id": "long-i-1",
        "category": "long-i",
        "text": "long-i: silent-e pattern in like, bike, time, fine, line",
        "phonics_rule": "Long I uses the silent-e pattern (i_e) — the final E is silent but makes the I say its name /eye/. Remove the E and the vowel goes short.",
        "example_words": ["like", "bike", "time", "fine", "line"]
    },
    {
        "id": "long-o-1",
        "category": "long-o",
        "text": "long-o: silent-e pattern in home, close, note, phone, stone",
        "phonics_rule": "Long O uses the silent-e pattern (o_e) — the final E is silent but makes the O say its name /oh/. Remove the E and the vowel goes short.",
        "example_words": ["home", "close", "note", "phone", "stone", "rope", "hope", "joke", "tome", "dome"]
    },
    {
        "id": "vowel-team-ai-1",
        "category": "vowel-team-ai",
        "text": "vowel-team-ai: AI sound in rain, tail, rail, train",
        "phonics_rule": "AI is a vowel team — two letters A and I that together make one sound /ay/. The individual A and I sounds disappear completely.",
        "example_words": ["rain", "tail", "rail", "mail", "train", "paint", "wait", "snail", "brain", "plain"]
    },
    {
        "id": "vowel-team-ee-1",
        "category": "vowel-team-ee",
        "text": "vowel-team-ee: EE sound in see, tree, need, feet, green",
        "phonics_rule": "EE is a vowel team — two letters E and E that together make one sound /ee/. The individual E and E sounds disappear completely.",
        "example_words": ["see", "tree", "need", "feet", "green", "sleep", "sheep", "beet", "meet", "cheese"]
    },
    {
        "id": "vowel-team-oa-1",
        "category": "vowel-team-oa",
        "text": "vowel-team-oa: OA sound in boat, coat, road, soap, toad",
        "phonics_rule": "OA is a vowel team — two letters O and A that together make one sound /oh/. The individual O and A sounds disappear completely.",
        "example_words": ["boat", "coat", "road", "soap", "toad", "float", "goat", "moat", "oat", "roam"]
    },
    {
        "id": "vowel-team-oo-1",
        "category": "vowel-team-oo",
        "text": "vowel-team-oo: OO sound in look, book, hook, moon, food",
        "phonics_rule": "OO is a vowel team with two sounds — short /oo/ as in 'book' and long /oo/ as in 'moon'. Context determines which sound to use.",
        "example_words": ["look", "book", "hook", "took", "cook", "moon", "food", "soon", "pool", "cool"]
    },

    #Third Grade Phonics(3 rules): prefix-un, prefix-re, suffix-ing
    {
        "id": "prefix-un-1",
        "category": "prefix-un",
        "text": "prefix-un: UN sound in under, understand, undo, unkind, unwell",
        "phonics_rule": "UN is a prefix — a group of letters added to the beginning of a word that changes its meaning. It often means 'not' or 'opposite of'.",
        "example_words": ["under", "understand", "undo", "unkind", "unwell"]
    },
    {
        "id": "prefix-re-1",
        "category": "prefix-re",
        "text": "prefix-re: RE sound in redo, return, repeat, rebuild, rewrite",
        "phonics_rule": "RE is a prefix — a group of letters added to the beginning of a word that changes its meaning. It often means 'again' or 'back'.",
        "example_words": ["redo", "return", "repeat", "rebuild", "rewrite"]
    },
    {
        "id": "suffix-ing-1",
        "category": "suffix-ing",
        "text": "suffix-ing: ING sound in running, jumping, playing, singing, dancing",
        "phonics_rule": "ING is a suffix — a group of letters added to the end of a word that changes its meaning. It often means 'doing' or 'in the process of'.",
        "example_words": ["running", "jumping", "playing", "singing", "dancing"]
    },

    #Fourth - Fifth Grade Phonics(7 rules): r-controlled-ar, r-controlled-er, silent-k, silent-w, silent-b, silent-gh, silent-l
    {
        "id": "r-controlled-ar-1",
        "category": "r-controlled-ar",
        "text": "r-controlled-ar: AR sound in car, star, far, warm, farm",
        "phonics_rule": "AR is a r-controlled vowel — a vowel that makes a different sound when it is followed by an R. The AR combination makes the /ɑ/ sound.",
        "example_words": ["car", "star", "far", "warm", "farm"]
    },
    {
        "id": "r-controlled-er-1",
        "category": "r-controlled-er",
        "text": "r-controlled-er: ER sound in her, better, letter, worker, teacher",
        "phonics_rule": "ER is a r-controlled vowel — a vowel that makes a different sound when it is followed by an R. The ER combination makes the /ɜː/ sound.",
        "example_words": ["her", "better", "letter", "worker", "teacher"]
    },
    {
        "id": "silent-k-1",
        "category": "silent-k",
        "text": "silent-k: K sound is silent in know, knife, knee, knock, know",
        "phonics_rule": "K is silent in words like know, knife, knee, knock. Often appears at the beginning of words before N where K is not pronounced.",
        "example_words": ["knife", "knee", "knock", "know", "knight", "knob", "knit"]
    },
    {
        "id": "silent-w-1",
        "category": "silent-w",
        "text": "silent-w: W sound is silent in wrench, write, wrong, wrap, wrong",
        "phonics_rule": "W is silent in words like wrap, write, wrong. Often appears before R in words like wrap, write, wrong, where the W is not pronounced.",
        "example_words": ["wrench", "write", "wrong", "wrap", "wrist", "wreck", "wren", "wrote"]
    },
    {
        "id": "silent-b-1",
        "category": "silent-b",
        "text": "silent-b: B is silent in MB pattern (lamb, thumb, climb) and BT pattern (doubt, debt, subtle)",
        "phonics_rule": "Silent B appears in two patterns — after M at the end of a word (lamb, bomb, comb) and before T (doubt, debt, subtle). In both cases the B is written but not pronounced.",
        "example_words": ["lamb", "thumb", "climb", "comb", "doubt", "debt", "subtle"]
    },
    {
        "id": "silent-gh-1",
        "category": "silent-gh",
        "text": "silent-gh: GH is silent in words like light, night, right, high, sigh",
        "phonics_rule": "Silent GH appears in words where the GH combination is not pronounced. It often follows a vowel and can make the vowel long (light, night) or be completely silent (sigh).",
        "example_words": ["light", "night", "right", "high", "sigh"]
    },
    {
        "id": "silent-l-1",
        "category": "silent-l",
        "text": "silent-l: L is silent in words like calm, half, talk, walk, yolk",
        "phonics_rule": "Silent L appears in words where the L is written but not pronounced. Common patterns include AL (calm), LF (half), and LK (talk, walk).",
        "example_words": ["calm", "half", "talk", "walk", "yolk"]
    }
]
