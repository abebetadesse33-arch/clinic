-- Run ONCE by the database administrator on 10.180.50.142, with real passwords substituted.
-- Do not commit the filled-in file. One schema and one user per app; each user can only reach
-- its own schema, and only from the app server (replace APP_SERVER_IP).
--
-- DDL rights (CREATE/ALTER/INDEX/DROP/REFERENCES) are included because Feud, Paraphrase and WA can
-- create their tables themselves. Once migrations are run explicitly, a separate migrator user
-- with DDL rights and an app user with DML only is stricter.

CREATE DATABASE IF NOT EXISTS afriet_clinic     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS afriet_school     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS afriet_feud       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS afriet_paraphrase CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS afriet_wa         CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'clinic_app'@'APP_SERVER_IP'     IDENTIFIED BY 'CHANGE_ME_1';
CREATE USER IF NOT EXISTS 'school_app'@'APP_SERVER_IP'     IDENTIFIED BY 'CHANGE_ME_2';
CREATE USER IF NOT EXISTS 'feud_app'@'APP_SERVER_IP'       IDENTIFIED BY 'CHANGE_ME_3';
CREATE USER IF NOT EXISTS 'paraphrase_app'@'APP_SERVER_IP' IDENTIFIED BY 'CHANGE_ME_4';
CREATE USER IF NOT EXISTS 'wa_app'@'APP_SERVER_IP'         IDENTIFIED BY 'CHANGE_ME_5';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES ON afriet_clinic.*     TO 'clinic_app'@'APP_SERVER_IP';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES ON afriet_school.*     TO 'school_app'@'APP_SERVER_IP';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES ON afriet_feud.*       TO 'feud_app'@'APP_SERVER_IP';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES ON afriet_paraphrase.* TO 'paraphrase_app'@'APP_SERVER_IP';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES ON afriet_wa.*         TO 'wa_app'@'APP_SERVER_IP';

-- Verify afterwards:  SHOW GRANTS FOR 'clinic_app'@'APP_SERVER_IP';  (repeat per user)
