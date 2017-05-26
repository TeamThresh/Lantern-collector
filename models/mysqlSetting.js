/**
 * Created by YS on 2017-03-16.
 */
var credentials = require('../credentials');
var mysql = require('mysql');

var poolCluster = mysql.createPoolCluster();
poolCluster.add('MASTER', credentials.mysql.masterConfig);
poolCluster.add('SLAVE1', credentials.mysql.slave1Config);

var readPool = poolCluster.of('SLAVE*', 'RR');
var writePool = poolCluster.of('MASTER', 'RR');

var getReadPool = function() {
    return new Promise(function(resolved, rejected) {
        return resolved(readPool);
    });
};

var getWritePool = function() {
    return new Promise(function(resolved, rejected) {
        return resolved(writePool);
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

module.exports.getReadPool = getReadPool;
module.exports.getWritePool = getWritePool;
module.exports.getConnection = getConnection;
module.exports.connBeginTransaction = connBeginTransaction;
module.exports.commitTransaction = commitTransaction;
module.exports.releaseConnection = releaseConnection;
module.exports.rollbackTransaction = rollbackTransaction;
