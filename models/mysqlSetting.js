/**
 * Created by YS on 2017-03-16.
 */
var credentials = require('../credentials');
var mysql = require('mysql');
var pool = mysql.createPool({
    connectTimeout: 60 * 60 * 1000,
    timeout: 60 * 60 * 1000,
    aquireTimeout: 60 * 60 * 1000,
    host: credentials.mysql.host,
    port: credentials.mysql.port,
    user: credentials.mysql.user,
    password: credentials.mysql.password,
    database: credentials.mysql.database,
    connectionLimit: 50,
    waitForConnections: true
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