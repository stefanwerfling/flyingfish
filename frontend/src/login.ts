import {Lang} from './inc/Lang.js';
import {Login} from './inc/Api/Login.js';

/**
 * Main function for ready document
 */
(async(): Promise<void> => {
    Lang.i('Lang_EN');

    jQuery(async() => {
        jQuery('#login_title').html(Lang.i().l('login_title'));

        const fnLogin = async(): Promise<void> => {
            const email = jQuery('#input_email').val() as string;
            const password = jQuery('#input_password').val() as string;

            if (email && password) {
                try {
                    const result = await Login.login(email, password);

                    if (result) {
                        window.location.replace('/index.html');
                    }
                } catch (e) {
                    alert(e);
                }
            }
        };

        jQuery('#input_email').on('keypress', (ev) => {
            if (ev.key === 'Enter') {
                jQuery('#input_password').trigger('focus');
            }
        });

        jQuery('#input_password').on('keypress', (ev) => {
            if (ev.key === 'Enter') {
                fnLogin();
            }
        });

        jQuery('#btnsignin').on('click', fnLogin);
    });
})();