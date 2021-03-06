var path = require("path");
var fs = require("fs");
var db = require("../models");
var axios = require("axios");
const {
    v4: uuidv4
} = require('uuid');

const consts = require("../utils/consts");
const userRepos = require("./user-repos");

var mockRepos = [{
        title: "Eat-Da-Burger",
        username: "nickelme",
        tech: "JavaScript, Handlebars, MySQL",
        compat: "100%",
        link: "https://www.google.com"
    },
    {
        title: "Note Taker",
        username: "eaclumpkens",
        tech: "JavaScript, Handlebars, MySQL",
        compat: "90%",
        link: "https://www.google.com"
    },
    {
        title: "Random Repo",
        username: "twkirkpatrick",
        tech: "JavaScript, Handlebars, MySQL",
        compat: "80%",
        link: "https://www.google.com"
    },

];

var allLangs = [];

module.exports = function(app) {

    var langs = fs.readFileSync("./languages.txt", {
        encoding: 'utf8',
        flag: 'r'
    });
    var langarray = langs.split("\n");

    for (var i = 0; i < langarray.length; i++) {
        var lang = langarray[i];
        lang = lang.replace(/\./g, "_");
        if (lang == "") {
            continue;
        }
        allLangs.push(lang);

    }

    app.get("/main", (req, res) => {

        var otherRepos = [];
        if (!req.cookies.uuid) {
            res.redirect("/");
        }
        // get current user
        if (req.cookies.uuid) {
            db.User.findOne({
                where: {
                    cookie: req.cookies.uuid
                }
            }).then((loggedUser) => {
                // pull userid
                if (!loggedUser) {
                    res.redirect("/");
                    return;
                }
                var id = loggedUser.id;

                // pull all repos
                db.Repo.findAll({}).then((allRepos) => {

                    // pull NONE USER repos
                    for (var i = 0; i < allRepos.length; i++) {
                        if (id !== allRepos[i].dataValues.UserId) {
                            otherRepos.push(allRepos[i].dataValues);
                            console.log(allRepos[i].dataValues.id);
                        };
                    };

                    var repos = [];
                    var totalRepos = otherRepos.length;
                    var reposCounted = 0;
                    // iterate through repos
                    for (var a = 0; a < otherRepos.length; a++) {

                        var repoData = {};
                        var userId = otherRepos[a].UserId;

                        // pull none null fields
                        Object.entries(otherRepos[a]).forEach(([key, value]) => {
                            if (value !== null) {
                                repoData[`${key}`] = `${value}`;
                            }
                        });
                        var getData = (repoToPopulate) => {
                            // get user data
                            var repoUrl = `${consts.GITHUB_REPO_BY_ID}${repoToPopulate.githubId}`;
                            console.log(repoUrl);
                            var header = {
                                headers: {
                                    "Authorization": `token ${loggedUser.dataValues.accessToken}`
                                }
                            }
                            axios.get(repoUrl, header).then((repoFromGithub) => {

                                repoToPopulate["username"] = `${repoFromGithub.data.owner.login}`;
                                repoToPopulate["avatar_url"] = `${repoFromGithub.data.owner.avatar_url}`;
                                repoToPopulate["github_url"] = `${repoFromGithub.data.owner.html_url}`;
                                repoToPopulate["repo_url"] = `${repoFromGithub.data.html_url}`

                                repos.push(repoToPopulate);
                                reposCounted++;
                                if (reposCounted == totalRepos) {
                                    for (var w = 0; w < repos.length; w++) {
                                        var techs = [];
                                        for (var z = 0; z < allLangs.length; z++) {
                                            for (const repoKey in repos[w]) {
                                                if (allLangs[z] === repoKey) {
                                                    techs.push(repoKey);
                                                }
                                            }
                                        }
                                        repos[w].tech = techs.join(", ");
                                        repos[w].compat = Math.round(Math.random() * 100) + "%";
                                    }
                                    axios.get(consts.GITHUB_USER_URL, header).then((currentUser) => {
                                        var userToSend = {
                                            pic: currentUser.data.avatar_url,
                                            repoCount: currentUser.data.public_repos,
                                            since: currentUser.data.created_at.substring(0, currentUser.data.created_at.indexOf("-")),
                                            name: currentUser.data.login
                                        };
                                        console.log(repos[0]);
                                        res.render("main-feed", {
                                            repos: repos,
                                            user: userToSend
                                        });
                                    });
                                }
                            });
                        };
                        getData(repoData);
                    };

                });
            });
        };
    });
};