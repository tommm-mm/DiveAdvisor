import "server-only";
import { randomInt } from "node:crypto";

// Alphabet without look-alikes (0/O, 1/I) so codes can be read aloud or copied from paper.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const generateCode = () => Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
