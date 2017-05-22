/**
 * Created by YS on 2017-02-10.
 */

var resourceModel = require('../models/resourceModel');
var checkModel = require('../models/checkModel');
var analyzeController = require('./analyzeController');
var maxmind = require('maxmind');

/**
 *
 * @type {{
 *  upload: module.exports.upload
 * }}
 */
module.exports = {

    upload: function (req, res, next) {
        var data = {
            access_token: req.header('access-token'),
            dump: req.body
        };

        // Client IP 가져옴
        var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        //(IPv6 to IPv4 format)
        ip = ip.split(':'); 
        data.dump.device_info.ip = ip[ip.length-1];

        saveDump(data.dump);
/*
        // City/Location lookup
        maxmind.open('./GeoLite2-City.mmdb', (err, cityLookup) => {
            if (err) {
                console.error(err);
                return err instanceof Number ? next(err) : next(500);
            }
            // Lookup table에 국가 코드 조회
            var city = cityLookup.get(data.dump.device_info.ip);

            // 국가코드, 국가 이름, 도시 이름
            data.dump.device_info.location = {
                code : city.country.iso_code,
                country_name : city.country.names.en,
                city_name : city.city.names.en
            };

            // 총 실행 횟수
            console.log("lanuch_time : "+data.dump.data.length);

            // TODO access_token 으로 User 인증
            // TODO validation 파싱을 controller로 뺄 것
            resourceModel.saveResourceDump(data.dump, function(err, resource) {
                if (err) {
                    return err instanceof Number ? next(err) : next(500);
                }
                if (resource.data.length > 0) {
                    analyzeController.saveAnalysisDump(
                        resource, 
                        function(err) {
                            if (err) {
                                console.error(err);
                                return err instanceof Number ? next(err) : next(500);
                            }
                            res.statusCode = 200;
                            return res.json({
                                msg: "complete"
                            });
                        });
                } else {
                    res.statusCode = 200;
                    return res.json({
                        msg: "complete"
                    });
                }
            });
        });
*/
    },

    uploadFromQueue: function (msg) {
        saveDump(msg);
    }
};

function saveDump(dump) {
    // City/Location lookup
    maxmind.open('./GeoLite2-City.mmdb', (err, cityLookup) => {
        if (err) {
            console.error(err);
            return err instanceof Number ? next(err) : next(500);
        }
        // Lookup table에 국가 코드 조회
        
	    dump = JSON.parse(dump);

        var city = cityLookup.get(dump.device_info.ip);

        // 국가코드, 국가 이름, 도시 이름
        dump.device_info.location = {
            code : city.country.iso_code,
            country_name : city.country.names.en,
            city_name : city.city.names.en
        };

        // 총 실행 횟수
        console.log("lanuch_time : "+dump.data.length);

        // TODO access_token 으로 User 인증
        // TODO validation 파싱을 controller로 뺄 것
        checkModel.checkPackageKey(dump.package_name, dump.project_key, function(err) {
            if (err) {
                console.error(err);
                return err instanceof Number ? next(err) : next(500);
            }
            resourceModel.saveResourceDump(dump, function(err, resource) {
                if (err) {
                    console.error(err);
                    return err instanceof Number ? next(err) : next(500);
                }
                if (resource.data.length > 0) {
                    analyzeController.saveAnalysisDump(
                        resource, 
                        function(err) {
                            if (err) {
                                console.error(err);
                                return err instanceof Number ? next(err) : next(500);
                            }
                console.info("{msg: complete}");
                        });
                } else {
            console.info("{msg: complete}");
                }
            });
        });
    });
};
