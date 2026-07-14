import numpy as np
import editdistance

def cos_sim(vec_a, vec_b):
    dot_product = np.dot(vec_a, vec_b)
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)

    
    return dot_product / (norm_a * norm_b)

def phoneme_similarity(expected: str, actual: str) -> float:
    
    if not expected or not actual:
        return 0.0

    exp = expected.split()
    act = actual.split()

    dist = editdistance.eval(exp, act)
    max_len = max(len(exp), len(act))
    return 1.0 - (dist / max_len)   