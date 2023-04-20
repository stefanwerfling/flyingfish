import {spawn} from 'child_process';

/**
 * IpRouteGet
 */
export type IpRouteGet = {
    network: string;
    gateway: string;
    interface: string;
    hostip: string;
};

/**
 * IpRoute
 */
export class IpRoute {

    /**
     * get
     * @param routeGetFlags
     */
    public static async get(routeGetFlags: number = 1): Promise<IpRouteGet | null> {
        const processIp = spawn(
            'ip',
            [
                'route',
                'get',
                `${routeGetFlags}`
            ]
        );

        let buffer = '';

        processIp.stdout!.on('data', (buf) => {
            buffer += buf.toString();
        });

        processIp.stderr!.on('data', (buf) => {
            console.log(buf.toString());
        });

        await new Promise((resolve) => {
            processIp.on('close', resolve);
        });

        if (buffer === '') {
            console.log('IpRoute::get: Buffer is empty!');
        } else {
            const parts = buffer.split(' ');

            if (parts && parts.length >= 8) {
                return {
                    network: parts[0],
                    gateway: parts[2],
                    interface: parts[4],
                    hostip: parts[6]
                };
            }
        }

        return null;
    }

}