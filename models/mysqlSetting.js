/**
 * Created by YS on 2017-03-16.
 */
var credentials = require('../credentials');
var mysql = require('mysql');
var pool = mysql.createPool({
    connectTimeout: 10000,
    timeout: 10000,
    aquireTimeout: 10000,
    host: credentials.mysql.host,
    port: credentials.mysql.port,
    user: credentials.mysql.user,
    password: credentials.mysql.password,
    database: credentials.mysql.database,
    connectionLimit: 500,
    waitForConnections: true,
    queueLimit: 50
});

var getPool = function() {
    return new Promise(function(resolved, rejected) {
        return resolved(pool);
    });
};

var getConnection = function(pool) {
    return new Promise(function(resolved, rejected) {
        pool.getConnection(function (err, connection) {
            if (err) {
                var error = new Error("에러 발생");
                error.status = 500;
                console.error(err);
                return rejected(error);
            }

            return resolved({ connection: connection });
        });
    });
};

var connBeginTransaction = function(context) {
    return new Promise(function(resolved, rejected) {
        context.connection.beginTransaction(function (err) {
            if (err) {
                var error = new Error("에러 발생");
                error.status = 500;
                console.error(err);
                return rejected(error);
            }

            return resolved(context);
        });
    });
};

var commitTransaction = function(context) {
    return new Promise(function(resolved, rejected) {
        context.connection.commit(function (err) {
            if (err) {
                var error = new Error("에러 발생");
                error.status = 500;
                console.error(err);
                return rejected(error);
            }
            releaseConnection(context);
            return resolved(context.result);
        });
    });
};

var rollbackTransaction = function(context) {
    return new Promise(function(resolved, rejected) {
        context.connection.rollback();
        return resolved(context);
    });
}

var releaseConnection = function(context) {
    return new Promise(function(resolved, rejected) {
        context.connection.release();
        return resolved(context);
    });
};

module.exports.getPool = getPool;
module.exports.getConnection = getConnection;
module.exports.connBeginTransaction = connBeginTransaction;
module.exports.commitTransaction = commitTransaction;
module.exports.releaseConnection = releaseConnection;
module.exports.rollbackTransaction = rollbackTransaction;
