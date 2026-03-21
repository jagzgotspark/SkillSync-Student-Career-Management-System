UPDATE mysql.user SET Password=PASSWORD('skillsync123') WHERE User='root';
FLUSH PRIVILEGES;
