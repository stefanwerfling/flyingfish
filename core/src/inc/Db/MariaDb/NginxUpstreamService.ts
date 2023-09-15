import {DBService} from './DBService.js';
import {NginxUpstream} from './Entity/NginxUpstream.js';
import {DeleteResult} from 'typeorm';

/**
 * Nginx upstream service object.
 */
export class NginxUpstreamService extends DBService<NginxUpstream> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'nginx_upstream';

    /**
     * Return an intance from nginx upstream service.
     * @returns {NginxUpstreamService}
     */
    public static getInstance(): NginxUpstreamService {
        return DBService.getSingleInstance(
            NginxUpstreamService,
            NginxUpstream,
            NginxUpstreamService.REGISTER_NAME
        );
    }

    /**
     * Find all Upstreams by stream id.
     * @param {number} streamId - ID of a stream.
     * @returns {NginxUpstream[]}
     */
    public async findAllStreams(streamId: number): Promise<NginxUpstream[]> {
        return this._repository.find({
            where: {
                stream_id: streamId
            }
        });
    }

    /**
     * Remove all Upstreams stream id.
     * @param {number} streamId - ID of a stream.
     */
    public async removeAllStreams(streamId: number): Promise<DeleteResult> {
        return this._repository.delete({
            stream_id: streamId
        });
    }

}