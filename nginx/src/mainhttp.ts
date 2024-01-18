/**
 * authorizeHttp
 * @param {NginxHTTPRequest} s
 */
const authorizeHttp = async(s: NginxHTTPRequest): Promise<void> => {
    const v = s.variables;

    if (!v.ff_authheader) {
        s.warn('authorize -> no authheader, send 401');
        s.return(401);
    } else if (v.ff_auth_basic_url) {
        let location_id = '0';
        let secret = '';

        if (v.ff_location_id) {
            location_id = v.ff_location_id;
        }

        if (v.ff_secret) {
            secret = v.ff_secret;
        }

        const resulte = await ngx.fetch(v.ff_auth_basic_url, {
            body: '',
            headers: {
                secret,
                authheader: v.ff_authheader,
                location_id
            },
            verify: false
        });

        s.warn(`authorize(fetch->status) -> ${resulte.status}`);

        if (resulte.status === 200) {
            s.return(200);
        } else {
            s.return(403);
        }
    } else {
        s.warn('authorize -> Auth Url not found!');
        s.return(500);
    }
};

export default {authorizeHttp};