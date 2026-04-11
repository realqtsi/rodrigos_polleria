/**
 * Utility for Web Bluetooth Thermal Printing
 * Handles connection, GATT services, and data chunking for ESC/POS printers.
 */

// Basic types for Web Bluetooth to silence lints
interface BluetoothDevice extends EventTarget {
    id: string;
    name?: string;
    gatt?: BluetoothRemoteGATTServer;
}

interface BluetoothRemoteGATTServer {
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothRemoteGATTService {
    getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTCharacteristic {
    writeValue(value: BufferSource): Promise<void>;
}

declare global {
    interface Navigator {
        bluetooth: {
            requestDevice(options: any): Promise<BluetoothDevice>;
        };
    }
}

export class BluetoothPrinter {
    private device: BluetoothDevice | null = null;
    private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

    // Thermal Printer UUIDs (Expanded list)
    private SERVICE_UUIDS = [
        '000018f0-0000-1000-8000-00805f9b34fb', // Generic POS
        '0000fff0-0000-1000-8000-00805f9b34fb', // TI
        '0000ff00-0000-1000-8000-00805f9b34fb', // Common 1
        '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // ISSC
    ];

    private CHARACTERISTIC_UUIDS = [
        '00002af1-0000-1000-8000-00805f9b34fb', // Generic Write
        '0000fff1-0000-1000-8000-00805f9b34fb', // TI Write
        '0000ff01-0000-1000-8000-00805f9b34fb', // Common 1 Write
        '49535343-8841-43f4-a8d4-ecbe34729bb3'  // ISSC Write
    ];

    static isSupported(): boolean {
        return typeof navigator !== 'undefined' && !!navigator.bluetooth;
    }

    /**
     * Request device and connect to primary service
     */
    async connect(): Promise<boolean> {
        try {
            console.log('Solicitando dispositivo Bluetooth...');

            // Request device with specific name filters
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'ADV' },
                    { namePrefix: 'BT' },
                    { namePrefix: 'P80' },
                    { namePrefix: 'Printer' },
                    { namePrefix: 'RT' },
                    { namePrefix: 'MTP' }
                ],
                optionalServices: this.SERVICE_UUIDS
            });

            if (!this.device) return false;

            console.log('Conectando a GATT Server...');
            const server = await this.device.gatt?.connect();

            console.log('Buscando Servicio Primario...');
            let service: BluetoothRemoteGATTService | undefined;

            // Try to find the first available service from our list
            for (const uuid of this.SERVICE_UUIDS) {
                try {
                    service = await server?.getPrimaryService(uuid);
                    if (service) {
                        console.log(`Servicio encontrado: ${uuid}`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (!service) throw new Error('No se encontró un servicio de impresión compatible.');

            console.log('Obteniendo Característica de Escritura...');
            // Try to find a characteristic that supports write
            for (const uuid of this.CHARACTERISTIC_UUIDS) {
                try {
                    this.characteristic = await service.getCharacteristic(uuid);
                    if (this.characteristic) {
                        console.log(`Característica encontrada: ${uuid}`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (!this.characteristic) {
                throw new Error('No se encontró una característica de escritura válida.');
            }

            console.log('Impresora Bluetooth vinculada correctamente.');
            return true;
        } catch (error) {
            console.error('Error en conexión Bluetooth:', error);
            throw error;
        }
    }

    /**
     * Send ESC/POS data in chunks
     */
    async print(data: Uint8Array): Promise<void> {
        if (!this.characteristic) {
            throw new Error('La impresora no está conectada.');
        }

        const CHUNK_SIZE = 20;
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
            const chunk = data.slice(i, i + CHUNK_SIZE);
            await this.characteristic.writeValue(chunk);
        }
    }

    /**
     * Disconnect device
     */
    disconnect() {
        if (this.device && this.device.gatt?.connected) {
            this.device.gatt.disconnect();
        }
        this.device = null;
        this.characteristic = null;
    }

    isConnected() {
        return !!(this.device && this.device.gatt?.connected);
    }
}

/**
 * Generator for ESC/POS commands
 */
export const ESCPOS = {
    RESET: new Uint8Array([0x1b, 0x40]),
    TEXT_SIZE_NORMAL: new Uint8Array([0x1d, 0x21, 0x00]),
    TEXT_SIZE_LARGE: new Uint8Array([0x1d, 0x21, 0x11]),
    TEXT_BOLD_ON: new Uint8Array([0x1b, 0x45, 0x01]),
    TEXT_BOLD_OFF: new Uint8Array([0x1b, 0x45, 0x00]),
    ALIGN_LEFT: new Uint8Array([0x1b, 0x61, 0x00]),
    ALIGN_CENTER: new Uint8Array([0x1b, 0x61, 0x01]),
    ALIGN_RIGHT: new Uint8Array([0x1b, 0x61, 0x02]),
    FEED_AND_CUT: new Uint8Array([0x1d, 0x56, 0x41, 0x03]),
    PAPER_FEED: (n: number) => new Uint8Array([0x1b, 0x64, n]),

    encodeText: (text: string) => {
        const encoder = new TextEncoder();
        return encoder.encode(text + '\n');
    }
};
