var express = require('express');
var router = express.Router();
var async = require('async');


// Load models
var User = require('../models/user');
var user = new User;
var Chat = require('../models/chat');
var chat = new Chat;
var Session = require('../models/session');
var session = new Session;

/*********************
// General Routes
/*********************/
router.get('/', function(req, res) {
    res.render('layouts/landing', req.session);
});

router.get('/login', function(req, res) {
    if (req.session && req.session.user) res.redirect('/users/' + req.session.user);
    else res.render('login');
});

router.get('/logout', function(req, res) {
    req.session.destroy()
    res.redirect("/users/login");
})

router.get('/about', function(req, res) {
	if (!req.session.user) res.redirect('/login');
    else {
        return async.parallel({
                channels: function(callback) {
                    chat.get_channels(req.params.id, req.session, callback);
                },
				direct_messages: function(callback) {
					chat.get_direct_messages(req.session.user, callback);
				}
            },
            function(err, results) {
                if (err) {
                    res.sendStatus(err.code);
                    console.log(err);
                } else {
					results.last_channel = results.channels.channels.pop();
                    res.render('layouts/about', results);
                }
            });
    }
})

/*********************
// Chat and Direct Message Routes
/*********************/

router.get('/chats/new', function(req, res) {
	if (!req.session.user) res.redirect('/login');
    else {
        return async.parallel({
                channels: function(callback) {
                    chat.get_channels(req.params.id, req.session, callback);
                },
				direct_messages: function(callback) {
					chat.get_direct_messages(req.session.user, callback);
				}
            },
            function(err, results) {
                if (err) {
                    res.sendStatus(err.code);
                    console.log(err);
                } else {
					results.last_channel = results.channels.channels.pop();
                    res.render('layouts/channel_create', results);
                }
            });
    }
})

router.get('/chats/:id', function(req, res) {
    if (!req.session.user) res.redirect('/login');
    else {
        return async.parallel({
                channels: function(callback) {
                    chat.get_channels(req.params.id, req.session, callback);
                },
                chat_history: function(callback) {
                    chat.get_history(req.params.id, callback);
                },
                direct_messages: function(callback) {
                    chat.get_direct_messages(req.session.user, callback);
                }
            },
            function(err, results) {
                if (err) {
                    res.sendStatus(err.code);
                    console.log(err);
                } else {
                    req.session.chat_id = req.params.id;
					results.dm = false;
                    res.render('chat', results);
                }
            });
    }
});

router.post('/chats', function(req, res) {
    var callback = (err, result) => {
        if (err) {
            res.sendStatus(err.code);
            console.log(err);
        } else {
            res.redirect("/chats/" + result.insertId);
            console.log(result);
        }
    }
    if (!req.session.user) res.redirect('login');
    else return chat.create(req.body, callback)
})

router.get('/direct_message/new', function(req, res) {
	if (!req.session.user) res.redirect('/login');
    else {
        return async.parallel({
                channels: function(callback) {
                    chat.get_channels(req.params.id, req.session, callback);
                },
				direct_messages: function(callback) {
					chat.get_direct_messages(req.session.user, callback);
				}
            },
            function(err, results) {
                if (err) {
                    res.sendStatus(err.code);
                    console.log(err);
                } else {
					results.last_channel = results.channels.channels.pop();
                    res.render('layouts/direct_message_create', results);
                }
            });
    }
});

router.get('/direct_message/:id/add_users', function(req, res) {
	if (!req.session.user) res.redirect('/login');
    else {
        return async.parallel({
                channels: function(callback) {
                    chat.get_channels(req.params.id, req.session, callback);
                },
				direct_messages: function(callback) {
					chat.get_direct_messages(req.session.user, callback);
				}
            },
            function(err, results) {
                if (err) {
                    res.sendStatus(err.code);
                    console.log(err);
                } else {
					results.last_channel = results.channels.channels.pop();
					results.params = req.params;
                    res.render('layouts/direct_message_add_users', results);
                }
            });
    }
});

router.get('/direct_message/:id', function(req, res) {
    var callback = function(error, verified) {
        if (error) {
            res.sendStatus(error.code);
            console.log(error);
        } else if (!verified) {
            console.log("Direct Message Verification Failed: Forbidden")
            res.status(403).redirect('/chats/1');
        } else {
            return async.parallel({
                    channels: function(callback) {
                        chat.get_channels(req.params.id, req.session, callback);
                    },
                    chat_history: function(callback) {
                        chat.get_history(req.params.id, callback);
                    },
                    direct_messages: function(callback) {
                        chat.get_direct_messages(req.session.user, callback);
                    }
                },
                function(err, results) {
                    if (err) {
                        res.sendStatus(err.code);
                        console.log(err);
                    } else {
                        req.session.chat_id = req.params.id;
						results.dm = true;
						results.dm_id = req.params.id;
                        res.render('chat', results);
                    }
                });
        }
    }

    if (!req.session.user) res.redirect('/login');
    else {
        chat.verify_direct_message(req.session.user, req.params.id, callback);
    }
});

router.get('/direct_message/:id/deactivate', function(req, res) {
    var callback = (err) => {
        if (err) {
            res.sendStatus(err.code);
            console.log(err);
        } else {
            res.sendStatus(200);
        }
    }
    if(!req.session.user) res.sendStatus(403);
    else return chat.mark_inactive(req.session.user, req.params.id, callback)
})

router.post('/direct_message', function(req, res) {
    var callback = (err, result) => {
        if (err) {
            res.sendStatus(err.code);
            console.log(err);
        } else {
            res.redirect("/chats/" + result.direct_message_id);
            console.log(result);
        }
    }
    if (!req.session.user) res.redirect('login');
    else return chat.create_direct_message(req.body.participants, req.session.username, callback)
})

router.post('/direct_message/:id/add_users', function(req, res) {
    var callback = (err, result) => {
        if (err) {
            res.sendStatus(err.code);
            console.log(err);
        } else {
            res.redirect("/direct_message/" + result);
            console.log(result);
        }
    }
    if(!req.session.user) res.redirect('login');
    else return chat.add_users_to_dm(req.body.users, req.params.id, callback)
})


/*********************
// User Routes
/*********************/

router.get('/users/:id', function(req, res) {
    if (!req.session.user) res.redirect('/login');
    else {
        return async.parallel({
                user: function(callback) {
                    user.get(req.params.id, req.session, callback);
                },
                channels: function(callback) {
                    chat.get_channels(req.params.id, req.session, callback);
                },
				direct_messages: function(callback) {
					chat.get_direct_messages(req.session.user, callback);
				}
            },
            function(err, results) {
                if (err) {
                    res.sendStatus(err.code);
                    console.log(err);
                } else {
					results.last_channel = results.channels.channels.pop();
					results.user = results.user[0];
                    res.render('layouts/user_profile', results);
                }
            });
    }
});

router.post('/users/login', function(req, res) {
    var callback = (err, result) => {
        if (err) {
            res.sendStatus(err.code);
            console.log(err);
        } else {
            if (result.validated) {
                res.redirect("/chats/1");
            } else {
                res.redirect("/login");
            }
        }
    }

    if (req.session.user) {
        res.redirect("/users/" + req.session.user);
    } else {
        return session.login(req.body.username, req.body.password, req.session, callback);
    }
});


router.post('/users/register', function(req, res) {
    var callback = (err, result) => {
        if (err) {
            if (err.code === 404) {
                res.status(404).send("Duplicate entry.");
            }
            console.log(err);
        } else {
            res.redirect("/chats/1");
            console.log(result);
        }
    }
    return user.create(req.body, req.session, callback)
});

router.post('/users/:id/edit', function(req, res) {
    var callback = (err, result) => {
        if (err) {
            res.sendStatus(err.code);
            console.log(err);
        } else {
            res.redirect("/users/" + req.session.user);
            console.log(result);
        }
    }
    req.body.id = req.params.id;
    return user.update(req.body, callback)
});

module.exports = router;