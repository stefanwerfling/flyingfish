import {Lang} from './inc/Lang';
import {Login} from './inc/Api/Login';

(async(): Promise<void> => {
    Lang.i('Lang_DE');
    jQuery('#login_title').html(Lang.i().l('login_title'));

    jQuery(async() => {
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