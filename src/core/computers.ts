import { ComputerMano } from "./computer-mano"
import { ComputerBen }  from "./computer-ben"

export const computers = {
    "MANO": ComputerMano,
    "BEN":  ComputerBen
}

export function computerName(c: string): string {
    return c.charAt(0).toUpperCase() +
        c.slice(1).toLowerCase() + "'s computer";
}
