import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * Initial schema baseline for FlyingFish.
 *
 * Generated from the 28 core entities (the schema synchronize:true produced until
 * now). New installations run this to create the full schema; existing databases
 * are auto-baselined at startup (this migration is stamped as already applied).
 */
export class InitialSchema1787961600000 implements MigrationInterface {

    public name = 'InitialSchema1787961600000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `credential` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(255) NOT NULL, `scheme` int NOT NULL, `provider` varchar(255) NOT NULL, `position` int NOT NULL, `settings` text NOT NULL DEFAULT '', PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `credential_location` (`id` int NOT NULL AUTO_INCREMENT, `credential_id` int NOT NULL, `location_id` int NOT NULL, `position` int NOT NULL, INDEX `IDX_80c9f17dcfbfbd665680e08180` (`credential_id`), INDEX `IDX_9207ccf1c90f10587f85252319` (`location_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `credential_user` (`id` int NOT NULL AUTO_INCREMENT, `credential_id` int NOT NULL, `username` varchar(255) NOT NULL, `password` varchar(255) NOT NULL, `disabled` tinyint NOT NULL, INDEX `IDX_deeb6188d4113018449b3408b5` (`credential_id`), INDEX `IDX_6d1ded51fa76225523f7478cf8` (`disabled`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `domain` (`id` int NOT NULL AUTO_INCREMENT, `domainname` varchar(512) NOT NULL, `fixdomain` tinyint NOT NULL DEFAULT 0, `recordless` tinyint NOT NULL DEFAULT 0, `disable` tinyint NOT NULL DEFAULT 0, `parent_id` int NOT NULL DEFAULT '0', INDEX `IDX_57b8e3c128414511239735790f` (`domainname`), INDEX `IDX_e466b93a2e9f46fd33554f3f85` (`disable`), INDEX `IDX_7d85eb18ed8935de858c8a3f22` (`parent_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `domain_record` (`id` int NOT NULL AUTO_INCREMENT, `domain_id` int NOT NULL, `dtype` int NOT NULL, `dclass` int NOT NULL, `ttl` int NOT NULL, `dvalue` text NOT NULL DEFAULT '', `settings` text NOT NULL DEFAULT '', `update_by_dnsclient` tinyint NOT NULL, `last_update` int NOT NULL DEFAULT '0', INDEX `IDX_0d40b1950796a077d3f1878f3f` (`domain_id`), INDEX `IDX_9e759a7b3bba111f12ad8d1b0a` (`dtype`), INDEX `IDX_1c3d4eb5ebbe7456fd0c424bd4` (`dclass`), INDEX `IDX_8a9ab9df1b970b65ca44356707` (`update_by_dnsclient`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `dyndns_client` (`id` int NOT NULL AUTO_INCREMENT, `provider` varchar(255) NOT NULL, `username` varchar(255) NOT NULL, `password` varchar(255) NOT NULL, `main_domain_id` int NOT NULL DEFAULT '0', `update_domain` tinyint NOT NULL DEFAULT 0, `gateway_identifier_id` int NOT NULL DEFAULT '0', `last_status` int NOT NULL DEFAULT '0', `last_update` int NOT NULL DEFAULT '0', PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `dyndns_client_domain` (`id` int NOT NULL AUTO_INCREMENT, `dyndnsclient_id` int NOT NULL, `domain_id` int NOT NULL, INDEX `IDX_4fc304d6b050257e303efe220c` (`dyndnsclient_id`), INDEX `IDX_02b07eb683dc0e23eba176224a` (`domain_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `dyndns_server_domain` (`id` int NOT NULL AUTO_INCREMENT, `user_id` int NOT NULL, `domain_id` int NOT NULL, INDEX `IDX_66e4ea43b7f2c7c66ea0d250f7` (`user_id`), INDEX `IDX_813230ebe0f6a90ec0b3b7e8b3` (`domain_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `dyndns_server_user` (`id` int NOT NULL AUTO_INCREMENT, `username` varchar(128) NOT NULL, `password` varchar(255) NOT NULL, `last_update` int NOT NULL DEFAULT '0', INDEX `IDX_dbfca2fb6f81f07a908b04bbb1` (`username`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `gateway_identifier` (`id` int NOT NULL AUTO_INCREMENT, `networkname` varchar(255) NOT NULL, `mac_address` varchar(255) NOT NULL, `address` varchar(255) NOT NULL DEFAULT '', `color` varchar(255) NOT NULL DEFAULT '', PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `ip_blacklist` (`id` int NOT NULL AUTO_INCREMENT, `ip` varchar(50) NOT NULL, `last_update` int NOT NULL DEFAULT '0', `is_imported` tinyint NOT NULL DEFAULT 0, `disabled` tinyint NOT NULL DEFAULT 0, `last_block` int NOT NULL DEFAULT '0', `count_block` int NOT NULL DEFAULT '0', `ip_location_id` int NOT NULL DEFAULT '0', `description` text NULL, INDEX `IDX_87269a7e83f4d2062d4474acce` (`ip`), INDEX `IDX_8f16c47032093e968eecbed7d0` (`last_update`), INDEX `IDX_70e8365778ed6285fe9ad9a24b` (`is_imported`), INDEX `IDX_f8e600f11f089f10299102b65f` (`disabled`), INDEX `IDX_5a96ec0d8bad0d3edf0d993553` (`last_block`), INDEX `IDX_59bd5c6dfd7d0f87550479c1c4` (`count_block`), INDEX `IDX_ea6e64d853d083a3b8d9ac2eeb` (`ip_location_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `ip_blacklist_category` (`id` int NOT NULL AUTO_INCREMENT, `ip_id` int NOT NULL, `cat_num` int NOT NULL, INDEX `IDX_f6f639a0725a5b7a2cc68ad7f7` (`ip_id`), INDEX `IDX_e17976cc007666355c3240027e` (`cat_num`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `ip_blacklist_maintainer` (`id` int NOT NULL AUTO_INCREMENT, `ip_id` int NOT NULL, `ip_maintainer_id` int NOT NULL, INDEX `IDX_dc15e06de96585f0df6411b16d` (`ip_id`), INDEX `IDX_47ec40562ab9ad944e33f99ec7` (`ip_maintainer_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `ip_list_maintainer` (`id` int NOT NULL AUTO_INCREMENT, `maintainer_name` varchar(200) NOT NULL, `maintainer_url` varchar(255) NOT NULL, `list_source_url` varchar(255) NOT NULL, INDEX `IDX_d93ae522d0331c6aa443eccde8` (`maintainer_name`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `ip_location` (`id` int NOT NULL AUTO_INCREMENT, `ip` varchar(50) NOT NULL, `country` varchar(255) NOT NULL DEFAULT '', `country_code` varchar(255) NOT NULL DEFAULT '', `city` varchar(255) NOT NULL DEFAULT '', `continent` varchar(255) NOT NULL DEFAULT '', `latitude` varchar(255) NOT NULL DEFAULT '', `longitude` varchar(255) NOT NULL DEFAULT '', `time_zone` varchar(255) NOT NULL DEFAULT '', `postal_code` varchar(255) NOT NULL DEFAULT '', `org` varchar(255) NOT NULL DEFAULT '', `asn` varchar(255) NOT NULL DEFAULT '', INDEX `IDX_71a8f650591550fcdd738b606a` (`ip`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `ip_whitelist` (`id` int NOT NULL AUTO_INCREMENT, `ip` varchar(50) NOT NULL, `last_update` int NOT NULL DEFAULT '0', `disabled` tinyint NOT NULL DEFAULT 0, `last_access` int NOT NULL DEFAULT '0', `count_access` int NOT NULL DEFAULT '0', `ip_location_id` int NOT NULL DEFAULT '0', `description` text NOT NULL DEFAULT '', INDEX `IDX_26ba53ad8f36979df14359083a` (`ip`), INDEX `IDX_4a260dd51ace1c08d70f97894e` (`last_update`), INDEX `IDX_6a34a444cf87c386092f9b2964` (`disabled`), INDEX `IDX_5fe7ac9d926e2d332fbf3436b0` (`last_access`), INDEX `IDX_8cdd2f3ec114df458090586739` (`count_access`), INDEX `IDX_524e351fe4d03b997014c7f0b4` (`ip_location_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `nat_port` (`id` int NOT NULL AUTO_INCREMENT, `postion` int NOT NULL DEFAULT '0', `public_port` int NOT NULL, `gateway_identifier_id` int NOT NULL, `gateway_address` varchar(255) NOT NULL, `private_port` int NOT NULL, `client_address` varchar(255) NOT NULL, `use_himhip_host_address` tinyint NOT NULL DEFAULT 0, `ttl` int NOT NULL, `protocol` varchar(255) NOT NULL DEFAULT '', `last_ttl_update` int NOT NULL DEFAULT '0', `listen_id` int NOT NULL DEFAULT '0', `description` varchar(255) NOT NULL, `last_status` int NOT NULL DEFAULT '0', `last_update` int NOT NULL DEFAULT '0', INDEX `IDX_ed88b807ee12486631bb312bc3` (`postion`), INDEX `IDX_95c3d874a302ca53f6cd3a2029` (`gateway_identifier_id`), INDEX `IDX_1bd12018e9c1c2c33d843e5e77` (`listen_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `nginx_http` (`id` int NOT NULL AUTO_INCREMENT, `domain_id` int NOT NULL, `listen_id` int NOT NULL, `index` int NOT NULL DEFAULT '0', `ssl_enable` tinyint NOT NULL DEFAULT 0, `http2_enable` tinyint NOT NULL DEFAULT 0, `cert_provider` varchar(255) NOT NULL DEFAULT '', `cert_wildcard` tinyint NOT NULL DEFAULT 0, `cert_email` varchar(255) NOT NULL DEFAULT '', `cert_lastupdate` int NOT NULL DEFAULT '0', `cert_last_request` int NOT NULL DEFAULT '0', `cert_create_attempts` int NOT NULL DEFAULT '0', `x_frame_options` varchar(255) NOT NULL DEFAULT 'DENY', `wellknown_disabled` tinyint NOT NULL DEFAULT 0, INDEX `IDX_f0df4554438e022f63e58bdceb` (`domain_id`), INDEX `IDX_d88816eb645ad1cdffe913e228` (`listen_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `nginx_http_variable` (`id` int NOT NULL AUTO_INCREMENT, `http_id` int NOT NULL, `context_type` int NOT NULL, `var_name` varchar(200) NOT NULL, `var_value` text NOT NULL, INDEX `IDX_afd9705113daf2e8d0a8b10d1e` (`http_id`), INDEX `IDX_577286f67a33afd9796ed001d3` (`context_type`), INDEX `IDX_ff71d9efa654dabfcda379307b` (`var_name`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `nginx_listen` (`id` int NOT NULL AUTO_INCREMENT, `listen_type` int NOT NULL, `listen_category` int NOT NULL DEFAULT '0', `listen_port` int NOT NULL, `listen_protocol` int NOT NULL DEFAULT '0', `enable_ipv6` tinyint NOT NULL DEFAULT 0, `name` varchar(512) NOT NULL, `description` text NOT NULL, `enable_upnp_nat` tinyint NOT NULL DEFAULT 0, `enable_address_check` tinyint NOT NULL DEFAULT 0, `address_check_type` int NOT NULL DEFAULT '0', `fixlisten` tinyint NOT NULL DEFAULT 0, `routeless` tinyint NOT NULL DEFAULT 0, `disable` tinyint NOT NULL DEFAULT 0, `proxy_protocol` tinyint NOT NULL DEFAULT 0, `proxy_protocol_in` tinyint NOT NULL DEFAULT 0, INDEX `IDX_df2617a04faa5fe230f1885532` (`listen_port`), INDEX `IDX_c559851bf4f6f62b38f01f22d8` (`listen_protocol`), INDEX `IDX_a8e422dca466b70b0730e75c90` (`disable`), INDEX `IDX_9204ad950b4855230dc19ab560` (`proxy_protocol`), INDEX `IDX_823a2a8fc8f1c4d847d488c1c1` (`proxy_protocol_in`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `nginx_listen_variable` (`id` int NOT NULL AUTO_INCREMENT, `listen_id` int NOT NULL, `context_type` int NOT NULL, `var_name` varchar(200) NOT NULL, `var_value` text NOT NULL, INDEX `IDX_bab0c9d5f72605f6a7073c5d3a` (`listen_id`), INDEX `IDX_1c79c5ef77c842b747e980def0` (`context_type`), INDEX `IDX_82ec5b74c6e2d4f986283eb7ce` (`var_name`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `nginx_location` (`id` int NOT NULL AUTO_INCREMENT, `http_id` int NOT NULL, `destination_type` int NOT NULL, `redirect_code` int NOT NULL DEFAULT '0', `redirect` varchar(255) NOT NULL DEFAULT '', `match` varchar(255) NOT NULL DEFAULT '/', `modifier` varchar(255) NOT NULL DEFAULT '', `proxy_pass` varchar(255) NOT NULL DEFAULT '', `auth_enable` tinyint NOT NULL DEFAULT 0, `auth_relam` varchar(255) NOT NULL DEFAULT '', `sshport_out_id` int NOT NULL DEFAULT '0', `sshport_schema` varchar(255) NOT NULL DEFAULT '', `websocket_enable` tinyint NOT NULL DEFAULT 0, `host_enable` tinyint NOT NULL DEFAULT 1, `host_name` varchar(255) NOT NULL DEFAULT '', `host_name_port` int NOT NULL DEFAULT '0', `xforwarded_scheme_enable` tinyint NOT NULL DEFAULT 1, `xforwarded_proto_enable` tinyint NOT NULL DEFAULT 1, `xforwarded_for_enable` tinyint NOT NULL DEFAULT 1, `xrealip_enable` tinyint NOT NULL DEFAULT 1, INDEX `IDX_16240c1c80ef4e95b8845173e8` (`http_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `nginx_stream` (`id` int NOT NULL AUTO_INCREMENT, `domain_id` int NOT NULL, `listen_id` int NOT NULL, `destination_type` int NOT NULL DEFAULT '1', `destination_listen_id` int NOT NULL DEFAULT '0', `index` int NOT NULL DEFAULT '0', `load_balancing_algorithm` varchar(128) NOT NULL DEFAULT 'none', `alias_name` varchar(512) NOT NULL DEFAULT '', `isdefault` tinyint NOT NULL DEFAULT 0, `use_as_default` tinyint NOT NULL DEFAULT 0, `ssh_r_type` int NOT NULL DEFAULT '0', `sshport_id` int NOT NULL DEFAULT '0', INDEX `IDX_b6fb0ab23a2e3ee9ce03a037df` (`domain_id`), INDEX `IDX_69dc0ba0fc192c37f018845ca0` (`listen_id`), INDEX `IDX_0aa730c6a13b123ff7c474353b` (`destination_type`), INDEX `IDX_57ef763dc915837114bc4924ab` (`destination_listen_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `nginx_upstream` (`id` int NOT NULL AUTO_INCREMENT, `stream_id` int NOT NULL, `index` int NOT NULL DEFAULT '0', `destination_address` varchar(512) NOT NULL, `destination_port` int NOT NULL, `weight` int NOT NULL DEFAULT '0', `max_fails` int NOT NULL DEFAULT '0', `fail_timeout` int NOT NULL DEFAULT '0', `proxy_protocol_out` tinyint NOT NULL DEFAULT 0, INDEX `IDX_285314c2a4c135f7b88a6f44be` (`stream_id`), INDEX `IDX_588b5b4ca880d0a0dd94c26ffc` (`proxy_protocol_out`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `settings` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(512) NOT NULL, `value` text NOT NULL DEFAULT '', INDEX `IDX_ca7857276d2a30f4dcfa0e42cd` (`name`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `ssh_port` (`id` int NOT NULL AUTO_INCREMENT, `ssh_user_id` int NOT NULL, `port` int NOT NULL, `forwardType` varchar(255) NOT NULL DEFAULT 'R', `destinationAddress` varchar(255) NOT NULL DEFAULT '', INDEX `IDX_4587327a9dd2a5320640931d6c` (`ssh_user_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `ssh_user` (`id` int NOT NULL AUTO_INCREMENT, `username` varchar(128) NOT NULL, `password` varchar(255) NOT NULL DEFAULT '', `disable` tinyint NOT NULL DEFAULT 1, INDEX `IDX_1ea243c294fdc59d965f737cf9` (`username`), INDEX `IDX_370ead630d3e9a39194a6a6293` (`disable`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `user` (`id` int NOT NULL AUTO_INCREMENT, `username` varchar(128) NOT NULL, `password` varchar(255) NOT NULL, `email` varchar(255) NOT NULL DEFAULT '', `disable` tinyint NOT NULL DEFAULT 1, INDEX `IDX_78a916df40e02a9deb1c4b75ed` (`username`), INDEX `IDX_e12875dfb3b1d92d7d7c5377e2` (`email`), INDEX `IDX_aedff30777d63eb27f605472a5` (`disable`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE `credential`");
        await queryRunner.query("DROP TABLE `credential_location`");
        await queryRunner.query("DROP INDEX `IDX_80c9f17dcfbfbd665680e08180` ON `credential_location`");
        await queryRunner.query("DROP INDEX `IDX_9207ccf1c90f10587f85252319` ON `credential_location`");
        await queryRunner.query("DROP TABLE `credential_user`");
        await queryRunner.query("DROP INDEX `IDX_deeb6188d4113018449b3408b5` ON `credential_user`");
        await queryRunner.query("DROP INDEX `IDX_6d1ded51fa76225523f7478cf8` ON `credential_user`");
        await queryRunner.query("DROP TABLE `domain`");
        await queryRunner.query("DROP INDEX `IDX_57b8e3c128414511239735790f` ON `domain`");
        await queryRunner.query("DROP INDEX `IDX_e466b93a2e9f46fd33554f3f85` ON `domain`");
        await queryRunner.query("DROP INDEX `IDX_7d85eb18ed8935de858c8a3f22` ON `domain`");
        await queryRunner.query("DROP TABLE `domain_record`");
        await queryRunner.query("DROP INDEX `IDX_0d40b1950796a077d3f1878f3f` ON `domain_record`");
        await queryRunner.query("DROP INDEX `IDX_9e759a7b3bba111f12ad8d1b0a` ON `domain_record`");
        await queryRunner.query("DROP INDEX `IDX_1c3d4eb5ebbe7456fd0c424bd4` ON `domain_record`");
        await queryRunner.query("DROP INDEX `IDX_8a9ab9df1b970b65ca44356707` ON `domain_record`");
        await queryRunner.query("DROP TABLE `dyndns_client`");
        await queryRunner.query("DROP TABLE `dyndns_client_domain`");
        await queryRunner.query("DROP INDEX `IDX_4fc304d6b050257e303efe220c` ON `dyndns_client_domain`");
        await queryRunner.query("DROP INDEX `IDX_02b07eb683dc0e23eba176224a` ON `dyndns_client_domain`");
        await queryRunner.query("DROP TABLE `dyndns_server_domain`");
        await queryRunner.query("DROP INDEX `IDX_66e4ea43b7f2c7c66ea0d250f7` ON `dyndns_server_domain`");
        await queryRunner.query("DROP INDEX `IDX_813230ebe0f6a90ec0b3b7e8b3` ON `dyndns_server_domain`");
        await queryRunner.query("DROP TABLE `dyndns_server_user`");
        await queryRunner.query("DROP INDEX `IDX_dbfca2fb6f81f07a908b04bbb1` ON `dyndns_server_user`");
        await queryRunner.query("DROP TABLE `gateway_identifier`");
        await queryRunner.query("DROP TABLE `ip_blacklist`");
        await queryRunner.query("DROP INDEX `IDX_87269a7e83f4d2062d4474acce` ON `ip_blacklist`");
        await queryRunner.query("DROP INDEX `IDX_8f16c47032093e968eecbed7d0` ON `ip_blacklist`");
        await queryRunner.query("DROP INDEX `IDX_70e8365778ed6285fe9ad9a24b` ON `ip_blacklist`");
        await queryRunner.query("DROP INDEX `IDX_f8e600f11f089f10299102b65f` ON `ip_blacklist`");
        await queryRunner.query("DROP INDEX `IDX_5a96ec0d8bad0d3edf0d993553` ON `ip_blacklist`");
        await queryRunner.query("DROP INDEX `IDX_59bd5c6dfd7d0f87550479c1c4` ON `ip_blacklist`");
        await queryRunner.query("DROP INDEX `IDX_ea6e64d853d083a3b8d9ac2eeb` ON `ip_blacklist`");
        await queryRunner.query("DROP TABLE `ip_blacklist_category`");
        await queryRunner.query("DROP INDEX `IDX_f6f639a0725a5b7a2cc68ad7f7` ON `ip_blacklist_category`");
        await queryRunner.query("DROP INDEX `IDX_e17976cc007666355c3240027e` ON `ip_blacklist_category`");
        await queryRunner.query("DROP TABLE `ip_blacklist_maintainer`");
        await queryRunner.query("DROP INDEX `IDX_dc15e06de96585f0df6411b16d` ON `ip_blacklist_maintainer`");
        await queryRunner.query("DROP INDEX `IDX_47ec40562ab9ad944e33f99ec7` ON `ip_blacklist_maintainer`");
        await queryRunner.query("DROP TABLE `ip_list_maintainer`");
        await queryRunner.query("DROP INDEX `IDX_d93ae522d0331c6aa443eccde8` ON `ip_list_maintainer`");
        await queryRunner.query("DROP TABLE `ip_location`");
        await queryRunner.query("DROP INDEX `IDX_71a8f650591550fcdd738b606a` ON `ip_location`");
        await queryRunner.query("DROP TABLE `ip_whitelist`");
        await queryRunner.query("DROP INDEX `IDX_26ba53ad8f36979df14359083a` ON `ip_whitelist`");
        await queryRunner.query("DROP INDEX `IDX_4a260dd51ace1c08d70f97894e` ON `ip_whitelist`");
        await queryRunner.query("DROP INDEX `IDX_6a34a444cf87c386092f9b2964` ON `ip_whitelist`");
        await queryRunner.query("DROP INDEX `IDX_5fe7ac9d926e2d332fbf3436b0` ON `ip_whitelist`");
        await queryRunner.query("DROP INDEX `IDX_8cdd2f3ec114df458090586739` ON `ip_whitelist`");
        await queryRunner.query("DROP INDEX `IDX_524e351fe4d03b997014c7f0b4` ON `ip_whitelist`");
        await queryRunner.query("DROP TABLE `nat_port`");
        await queryRunner.query("DROP INDEX `IDX_ed88b807ee12486631bb312bc3` ON `nat_port`");
        await queryRunner.query("DROP INDEX `IDX_95c3d874a302ca53f6cd3a2029` ON `nat_port`");
        await queryRunner.query("DROP INDEX `IDX_1bd12018e9c1c2c33d843e5e77` ON `nat_port`");
        await queryRunner.query("DROP TABLE `nginx_http`");
        await queryRunner.query("DROP INDEX `IDX_f0df4554438e022f63e58bdceb` ON `nginx_http`");
        await queryRunner.query("DROP INDEX `IDX_d88816eb645ad1cdffe913e228` ON `nginx_http`");
        await queryRunner.query("DROP TABLE `nginx_http_variable`");
        await queryRunner.query("DROP INDEX `IDX_afd9705113daf2e8d0a8b10d1e` ON `nginx_http_variable`");
        await queryRunner.query("DROP INDEX `IDX_577286f67a33afd9796ed001d3` ON `nginx_http_variable`");
        await queryRunner.query("DROP INDEX `IDX_ff71d9efa654dabfcda379307b` ON `nginx_http_variable`");
        await queryRunner.query("DROP TABLE `nginx_listen`");
        await queryRunner.query("DROP INDEX `IDX_df2617a04faa5fe230f1885532` ON `nginx_listen`");
        await queryRunner.query("DROP INDEX `IDX_c559851bf4f6f62b38f01f22d8` ON `nginx_listen`");
        await queryRunner.query("DROP INDEX `IDX_a8e422dca466b70b0730e75c90` ON `nginx_listen`");
        await queryRunner.query("DROP INDEX `IDX_9204ad950b4855230dc19ab560` ON `nginx_listen`");
        await queryRunner.query("DROP INDEX `IDX_823a2a8fc8f1c4d847d488c1c1` ON `nginx_listen`");
        await queryRunner.query("DROP TABLE `nginx_listen_variable`");
        await queryRunner.query("DROP INDEX `IDX_bab0c9d5f72605f6a7073c5d3a` ON `nginx_listen_variable`");
        await queryRunner.query("DROP INDEX `IDX_1c79c5ef77c842b747e980def0` ON `nginx_listen_variable`");
        await queryRunner.query("DROP INDEX `IDX_82ec5b74c6e2d4f986283eb7ce` ON `nginx_listen_variable`");
        await queryRunner.query("DROP TABLE `nginx_location`");
        await queryRunner.query("DROP INDEX `IDX_16240c1c80ef4e95b8845173e8` ON `nginx_location`");
        await queryRunner.query("DROP TABLE `nginx_stream`");
        await queryRunner.query("DROP INDEX `IDX_b6fb0ab23a2e3ee9ce03a037df` ON `nginx_stream`");
        await queryRunner.query("DROP INDEX `IDX_69dc0ba0fc192c37f018845ca0` ON `nginx_stream`");
        await queryRunner.query("DROP INDEX `IDX_0aa730c6a13b123ff7c474353b` ON `nginx_stream`");
        await queryRunner.query("DROP INDEX `IDX_57ef763dc915837114bc4924ab` ON `nginx_stream`");
        await queryRunner.query("DROP TABLE `nginx_upstream`");
        await queryRunner.query("DROP INDEX `IDX_285314c2a4c135f7b88a6f44be` ON `nginx_upstream`");
        await queryRunner.query("DROP INDEX `IDX_588b5b4ca880d0a0dd94c26ffc` ON `nginx_upstream`");
        await queryRunner.query("DROP TABLE `settings`");
        await queryRunner.query("DROP INDEX `IDX_ca7857276d2a30f4dcfa0e42cd` ON `settings`");
        await queryRunner.query("DROP TABLE `ssh_port`");
        await queryRunner.query("DROP INDEX `IDX_4587327a9dd2a5320640931d6c` ON `ssh_port`");
        await queryRunner.query("DROP TABLE `ssh_user`");
        await queryRunner.query("DROP INDEX `IDX_1ea243c294fdc59d965f737cf9` ON `ssh_user`");
        await queryRunner.query("DROP INDEX `IDX_370ead630d3e9a39194a6a6293` ON `ssh_user`");
        await queryRunner.query("DROP TABLE `user`");
        await queryRunner.query("DROP INDEX `IDX_78a916df40e02a9deb1c4b75ed` ON `user`");
        await queryRunner.query("DROP INDEX `IDX_e12875dfb3b1d92d7d7c5377e2` ON `user`");
        await queryRunner.query("DROP INDEX `IDX_aedff30777d63eb27f605472a5` ON `user`");
    }

}
