import { config } from "dotenv";
import { Tivo } from "./tivo";

config();

const tivo = new Tivo(
    process.env.TIVO_IP ?? '',
    process.env.TIVO_MAK ?? ''
);

export const getConnectedTivo = async () : Promise<Tivo> => {
    if (!tivo.isConnected()) {
        await tivo.connect();
    }
    return tivo;
}