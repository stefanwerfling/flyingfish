import fs from 'fs';

/**
 * Docker
 * https://www.npmjs.com/package/dockerode
 * https://blog.networkprofile.org/my-traefik-reverse-proxy-setup/
 * https://www.npmjs.com/package/node-docker-api
 */
export class Docker {

    /**
     * is docker
     * @private
     */
    private static _isDocker: boolean|null = null;

    /**
     * _hasDockerEnv
     * @private
     */
    private static _hasDockerEnv(): boolean {
        try {
            fs.statSync('/.dockerenv');
            return true;
        } catch {
            return false;
        }
    }

    /**
     * _hasDockerCGroup
     * @private
     */
    private static _hasDockerCGroup(): boolean {
        try {
            return fs.readFileSync('/proc/self/cgroup', 'utf8').includes('docker');
        } catch {
            return false;
        }
    }

    /**
     * isDocker
     */
    public static isDocker(): boolean {
        if (Docker._isDocker === null) {
            Docker._isDocker = Docker._hasDockerEnv() || Docker._hasDockerCGroup();
        }

        return Docker._isDocker;
    }

}