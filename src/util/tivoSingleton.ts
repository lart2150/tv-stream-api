import { config } from "dotenv";
import { Tivo } from "./tivo";

config();

const tivo = new Tivo(
    process.env.TIVO_IP ?? '',
    process.env.TIVO_MAK ?? ''
);

let connectingPromise : Promise<void>|null = null;

export const getConnectedTivo = async () : Promise<Tivo> => {
    console.log('getting tivo');
    if (connectingPromise) {
        await connectingPromise;
    }

    if (!tivo.isConnected()) {
        console.log('new connection');
        if (!connectingPromise) {
            connectingPromise = tivo.connect();
        }
        await connectingPromise;
        connectingPromise = null;
    }
    return tivo;
}

