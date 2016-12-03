
Parse.Cloud.define('hello', function(req, res) {
  res.success('Hi');
});

var _ = require('underscore');

Parse.Cloud.define("unread_counts", function(request, response) {
    // Parse.Cloud.useMasterKey();
    var currentUser = request.user;
    var token = currentUser.getSessionToken();
    var promises = [];
    var query;

    query = new Parse.Query('Message');
    query.equalTo('unreadUserIds', currentUser.id);
    promises.push(query.find({ sessionToken: token, useMasterKey: true}));

    query = new Parse.Query('Notification');
    query.equalTo('owner', currentUser);
    query.equalTo('read', false);
    promises.push(query.count());

    var promise = Parse.Promise.when(promises);
    promise.then(function(messages, notificationCount) {
        var responseObj = {};
        responseObj['messages'] = messages.length || 0;
        responseObj['notifications'] = notificationCount;
        responseObj['conversations'] = {};
        _.each(messages, function(message) {
            var key = message.get('conversationKey');
            var count = responseObj['conversations'][key] || 0;
            responseObj['conversations'][key] = count + 1;
        });
        return Parse.Promise.as(responseObj);
    }).then(function(responseObj) {
        response.success(responseObj);
    }, function(error) {
        response.error('Error getting unread counts');
        console.log('Error getting unread counts: ' + JSON.stringify(error));
    });
});

// Parse.Cloud.define("mark_notification_read", function(request, response) {
//     Parse.Cloud.useMasterKey();
//     var notificationId = request.params.notificationId;
//     if (!notificationId) {
//         response.error('notificationId must be supplied');
//     } else {
//         var query = new Parse.Query('Notification');
//         query.get(notificationId).then(function(notification) {
//             if (notification.get('read') === true) {
//                 return Parse.Promise.error("Notification already marked as read");
//             }
//             notification.set('read', true);
//             return notification.save();
//         }).then(function(user) {
//             response.success(user);
//         }, function(error) {
//             response.error('Error marking notification read');
//             console.log('Error marking notification read: ' + JSON.stringify(error));
//         });
//     }
// });
//
// Parse.Cloud.beforeSave("Conversation", function(request, response) {
//     Parse.Cloud.useMasterKey();
//     var conversation = request.object;
//     if (conversation.isNew() !== true) {
//         response.success();
//     } else {
//         var conversationKey = conversation.get('conversationKey');
//         var owner = conversation.get('owner');
//         var query = new Parse.Query('Conversation');
//         query.equalTo('conversationKey', conversationKey);
//         query.equalTo('owner', owner);
//         query.count().then(function(count) {
//             if (count > 0) {
//                 response.error("Conversation already exists for user " + owner.id + " conversationKey " + conversationKey);
//             } else {
//                 response.success();
//             }
//         }, function(error) {
//             response.error("Error fetching conversations in Conversation beforeSave");
//         });
//     }
// });
//
// Parse.Cloud.define("mark_messages_read", function(request, response) {
//     Parse.Cloud.useMasterKey();
//     var messageIds = request.params.messageIds;
//     var currentUserId = Parse.User.current().id;
//     if (!messageIds) {
//         response.error('messageIds must be supplied');
//     } else {
//         var messages = _.map(messageIds, function(messageId) {
//             var message = new Parse.Object("Message");
//             message.id = messageId;
//             return message;
//         });
//         Parse.Object.fetchAll(messages).then(function(messages) {
//             _.each(messages, function(message) {
//                 var unreadUserIds = message.get('unreadUserIds');
//                 var newIds = _.filter(unreadUserIds, function(userId) {
//                     return userId !== currentUserId;
//                 });
//                 message.set('unreadUserIds', newIds);
//             });
//             return Parse.Object.saveAll(messages);
//         }).then(function(user) {
//             response.success(user);
//         }, function(error) {
//             response.error('Error marking messages read');
//             console.log('Error marking messages read: ' + JSON.stringify(error));
//         });
//     }
// });
//
// function conversationsForMessage(message) {
//     var conversationKey = message.get('conversationKey');
//     var query = new Parse.Query('Conversation');
//     query.equalTo('conversationKey', conversationKey);
//     return query.find().then(function(conversations) {
//         if (conversations.length === 0) {
//             var conversations = [];
//             var participants = message.get('participants');
//             _.each(participants, function(owner) {
//                 var Conversation = Parse.Object.extend("Conversation");
//                 var conversation = new Conversation();
//                 conversation.set('owner', owner);
//                 conversation.set('conversationKey', conversationKey);
//                 conversation.set('participants', participants);
//                 conversations.push(conversation);
//             });
//             return Parse.Object.saveAll(conversations);
//         } else {
//             return Parse.Promise.as(conversations);
//         }
//     });
// }
//
// Parse.Cloud.afterSave("Message", function(request) {
//     Parse.Cloud.useMasterKey();
//     var message = request.object;
//     if (message.existed() === true) {
//         // Ignore
//     } else {
//         var currentUserId = Parse.User.current().id;
//         var promise = conversationsForMessage(message);
//         promise.then(function(conversations) {
//             var promises = _.map(conversations, function(conversation) {
//                 conversation.set('lastMessage', message);
//                 return conversation.save();
//             });
//             return Parse.Promise.when(promises);
//         }).then(function() {
//             var conversations = Array.prototype.slice.call(arguments);
//             var users = _.filter(conversations, function(conversation) {
//                 return conversation.get('owner').id !== currentUserId;
//             }).map(function(conversation) {
//                 var user = new Parse.User();
//                 user.id = conversation.get('owner').id;
//                 return user;
//             });
//             var sender = Parse.User.current();
//             var text = message.get('text');
//             var participantIds = _.map(users, function(user) {
//                 return user.id;
//             });
//             participantIds.push(sender.id);
//             var data = {
//                 'messageId': message.id,
//                 'participantIds': participantIds
//             };
//             return handleNotifications('message', text, data, users, true);
//         }).then(function() {
//             console.log('Message ' + message.id + ' processed');
//             // All ok
//         }, function(error) {
//             console.log('Error processing new message: ' + JSON.stringify(error));
//         });
//     }
// });
//
// Parse.Cloud.define("like", function(request, response) {
//     Parse.Cloud.useMasterKey();
//     var activityId = request.params.activityId;
//     if (!activityId) {
//         response.error('activityId must be supplied');
//     } else {
//         var query = new Parse.Query('Activity');
//         query.include('owner');
//         query.get(activityId).then(function(activity) {
//             var userId = Parse.User.current().id;
//             activity.addUnique('likerIds', userId);
//             return activity.save();
//         }).then(function(activity) {
//             var owner = activity.get('owner');
//             var text = activity.get('activity');
//             var data = {
//                 'activityId': activity.id
//             };
//             return handleNotifications('like', text, data, [owner], false);
//         }).then(function() {
//             response.success();
//         }, function(error) {
//             response.error('Error liking activity: ' + JSON.stringify(error));
//         });
//     }
// });
//
// Parse.Cloud.define("unlike", function(request, response) {
//     Parse.Cloud.useMasterKey();
//     var activityId = request.params.activityId;
//     if (!activityId) {
//         response.error('activityId must be supplied');
//     } else {
//         var query = new Parse.Query('Activity');
//         query.include('owner');
//         query.get(activityId).then(function(activity) {
//             var userId = Parse.User.current().id;
//             activity.remove('likerIds', userId);
//             return activity.save();
//         }).then(function() {
//             response.success();
//         }, function(error) {
//             response.error('Error liking activity: ' + JSON.stringify(error));
//         });
//     }
// });
//
// Parse.Cloud.define("meetup_like", function(request, response) {
//     Parse.Cloud.useMasterKey();
//     var meetupId = request.params.meetupId;
//     if (!meetupId) {
//         response.error('meetupId must be supplied');
//     } else {
//         var query = new Parse.Query('Meetup');
//         query.equalTo('meetupId', meetupId);
//         query.find().then(function(searchResults) {
//         	var meetup = searchResults[0];
//         	console.log('Meetup found: ' + searchResults.length);
//
//             var userId = Parse.User.current().id;
//             meetup.addUnique('likerIds', userId);
//             return meetup.save();
//         }).then(function() {
//             response.success();
//         }, function(error) {
//             response.error('Error liking meetup: ' + JSON.stringify(error));
//         });
//     }
// });
//
// Parse.Cloud.define("meetup_unlike", function(request, response) {
//     Parse.Cloud.useMasterKey();
//     var meetupId = request.params.meetupId;
//     if (!meetupId) {
//         response.error('meetupId must be supplied');
//     } else {
//         var query = new Parse.Query('Meetup');
//         query.equalTo('meetupId', meetupId);
//         query.find().then(function(searchResults) {
//         	var meetup = searchResults[0];
//         	console.log('Meetup found: ' + searchResults.length);
//             var userId = Parse.User.current().id;
//             meetup.remove('likerIds', userId);
//             return meetup.save();
//         }).then(function() {
//             response.success();
//         }, function(error) {
//             response.error('Error liking meetup: ' + JSON.stringify(error));
//         });
//     }
// });
//
// function updateActivityCommenters(comment) {
//     var activity = comment.get('activity');
//     return activity.fetch().then(function(activity) {
//         var query = new Parse.Query('Comment');
//         query.equalTo('activity', activity);
//         query.include('owner');
//         return Parse.Promise.when(query.find(), activity);
//     }).then(function(comments, activity) {
//         var ids = [];
//         for (var i=0; i<comments.length; ++i) {
//             ids.push(comments[i].get('owner').id);
//         }
//         activity.set('commenterIds', ids);
//         return activity.save();
//     });
// }
//
// function updateMeetupCommenters(comment) {
//     var meetup = comment.get('meetup');
//     return meetup.fetch().then(function(meetup) {
//         var query = new Parse.Query('Comment');
//         query.equalTo('meetup', meetup);
//         return Parse.Promise.when(query.find(), meetup);
//     }).then(function(comments, meetup) {
//         var ids = [];
//         for (var i=0; i<comments.length; ++i) {
//             ids.push(comments[i].get('owner').id);
//         }
//         meetup.set('commenterIds', ids);
//         return meetup.save();
//     });
// }
//
// Parse.Cloud.afterSave("Comment", function(request) {
//     Parse.Cloud.useMasterKey();
//     var comment = request.object;
//     if (comment.existed() === true) {
//         // Ignore
//     } else {
//
//     var meetup = comment.get('meetup');
// 	console.log('Meetup value:' + meetup);
//
// 	if (meetup === undefined) {
//
// 		var promise = updateActivityCommenters(comment);
// 		promise.then(function(activity) {
// 		    var owner = activity.get('owner');
// 		    var text = comment.get('text');
// 		    var data = {
// 		        'commentId': comment.id,
// 		        'activityId': activity.id
// 		    };
// 		    return handleNotifications('comment', text, data, [owner], false);
// 		}).then(function() {
// 			// All ok
// 		}, function(error) {
// 			console.log('Process comment error: ' + JSON.stringify(error));
// 		});
//
// 	} else {
// 		var promise = updateMeetupCommenters(comment);
// 		promise.then(function() {
// 		    // All ok
// 		}, function(error) {
// 		    console.log('Process comment error: ' + JSON.stringify(error));
// 		});
// 	}
//
//     // return meetup.fetch().then(function(meetup) {
//     //
//     //
//     //
//     //
//     // });
//
// //    if (comment.meetup === undefined) {
// //
// //
// //    } else {
// //    	var promise = updateMeetupCommenters(comment);
// //		promise.then(function() {
// //    	    // All ok
// //    	}, function(error) {
// //    	    console.log('Process comment error: ' + JSON.stringify(error));
// //    	});
// //    }
// //
//
//
//
//
//     }
// });
//
// function handleNotifications(type, text, data, recipients, pushOnly) {
//     if (pushOnly === true) {
//         return handlePush(type, text, data, recipients, []);
//     } else {
//         var sender = Parse.User.current();
//         var promises = _.map(recipients, function(owner) {
//             var Notification = Parse.Object.extend('Notification');
//             var notification = new Notification({
//                 ACL: new Parse.ACL(owner)
//             });
//             notification.set('type', type);
//             notification.set('owner', owner);
//             notification.set('sender', sender);
//             notification.set('text', text);
//             notification.set('data', data);
//             notification.set('read', false);
//             return notification.save();
//         });
//         return Parse.Promise.when(promises).then(function(notifications) {
//             return handlePush(type, text, data, recipients, notifications);
//         });
//     }
// }
//
// function handlePush(type, text, data, recipients, notifications) {
//     data['type'] = type;
//     if (_.isArray(notifications) !== true) {
//         notifications = [notifications];
//     }
//     var sender = Parse.User.current();
//     var senderName = sender.get('firstName')+' '+sender.get('lastName');
//     if (type === 'like') {
//         text = senderName+' liked your activity: "'+text+'"';
//     } else if (type === 'comment') {
//         text = senderName+' has commented on your activity: "'+text+'"';
//     }
//     var payloads = _.zip(recipients, notifications);
//     var promises = _.map(payloads, function(payload) {
//         var user = _.first(payload);
//         var notification = _.last(payload);
//         var query = new Parse.Query(Parse.Installation);
//         query.equalTo('user', user);
//         if (typeof notification !== 'undefined') {
//             data['notificationId'] = notification.id;
//         }
//         return Parse.Push.send({
//            'where': query,
//            'data': {
//                 'alert': text,
//                 'badge': 'Increment',
//                 'content-available': 1,
//                 'data': data
//            }
//         });
//     });
//     return Parse.Promise.when(promises);
// }
//
// Parse.Cloud.define("activities", function(request, response) {
//     var location = request.params.location;
//     if (!location) {
//         response.error('Field location must be supplied');
//     } else {
//         var currentUser = Parse.User.current();
//         var maxResults = 50;
//         var proximityInMiles = 200;
//         var promises = [];
//         var query;
//
//         query = new Parse.Query('Activity');
//         query.notEqualTo('deleted', true);
//         query.withinMiles('location', location, proximityInMiles);
//         query.notEqualTo('owner', currentUser);
//         query.greaterThanOrEqualTo('endDate', new Date());
//         query.ascending("startDate");
//         query.include('owner');
//         promises.push(query.find());
//
//         query = new Parse.Query(Parse.User);
//         query.withinMiles('homeLocation', location, proximityInMiles);
//         query.notEqualTo('objectId', currentUser.id);
//         promises.push(query.find());
//
//         var promise = Parse.Promise.when(promises);
//         promise.then(function(activities, users) {
//             activities = activities || [];
//             activities = activities.slice(0, maxResults);
//             var activityCount = activities.length;
//
//             var maxUsers = Math.max(50 - activityCount, 0);
//             var onlineWindowMaxSeconds = 3600 * 4; /* 4 hours */
//
//             var now = new Date().getTime() / 1000;
//             var onlineUsers = _.filter(users, function(user) {
//                 var lastOnline = user.get('lastOnline').getTime() / 1000;
//                 return now - lastOnline < onlineWindowMaxSeconds;
//             });
//             var offlineUsers = _.difference(users, onlineUsers);
//             var sortedUsers = onlineUsers.concat(offlineUsers);
//             var slicedUsers = sortedUsers.slice(0, maxUsers);
//
//             var responseObj = {
//                 'activities': activities,
//                 'users': slicedUsers
//             }
//             response.success(responseObj);
//         }, function(error) {
//             console.log('Activities query error: ' + JSON.stringify(error));
//             response.error('Activities query error');
//         });
//     }
// });
//
// Parse.Cloud.define("linkedin_distance", function(request, response) {
//     Parse.Cloud.useMasterKey();
//     var token = request.params.liToken;
//     var userId = request.params.userId;
//     var query = new Parse.Query(Parse.User);
//     query.get(userId).then(function(user) {
//         var li_uid = user.get('li_uid');
//         return Parse.Cloud.httpRequest({
//             url: 'https://api.linkedin.com/v1/people::(~,id='+li_uid+'):(relation-to-viewer:(distance))',
//             params: {
//                 'oauth2_access_token' : token
//             },
//             headers:{
//                 'Content-Type': 'application/json',
//                 'x-li-format': 'json'
//         }}).then(function(distanceResponse) {
//             var responseVals = distanceResponse.data.values;
//             var distance = -1;
//             _.each(responseVals, function(value) {
//                 var key = value['_key'];
//                 if (key === 'id='+li_uid) {
//                     try {
//                         distance = value['relationToViewer']['distance'];
//                     } catch(err) {}
//                 }
//             });
//             return Parse.Promise.as(distance);
//         });
//     }).then(function(distance) {
//         response.success({
//             distance: distance
//         });
//     }, function(error) {
//         response.error(error);
//     });
// });
//
// Parse.Cloud.define("auth_linkedin", function(request, response) {
//     Parse.Cloud.useMasterKey();
//     var fields = [
//         'id',
//         'first-name',
//         'last-name',
//           'formatted-name',
//           'headline',
//           'location:(name)',
//           'summary',
//           'positions',
//           'picture-url',
//           'public-profile-url',
//           'email-address'
//     ];
//     var token = request.params.liToken;
//     if (!token) {
//         response.error('Field liToken must be supplied');
//     } else {
//         var promises = [];
//         promises.push(Parse.Cloud.httpRequest({
//             url: 'https://api.linkedin.com/v1/people/~:(' + fields.join(',') + ')',
//             params: {
//                 'oauth2_access_token' : token
//             },
//             headers:{
//                 'Content-Type': 'application/json',
//                 'x-li-format': 'json'
//         }}));
//         promises.push(Parse.Cloud.httpRequest({
//             url: 'https://api.linkedin.com/v1/people/~/picture-urls::(original)',
//             params: {
//                 'oauth2_access_token' : token
//             },
//             headers:{
//                 'Content-Type': 'application/json',
//                 'x-li-format': 'json'
//         }}));
//         Parse.Promise.when(promises).then(function(profileReponse, avatarReponse) {
//             var profile = profileReponse.data;
//             profile.largePictureUrl = '';
//             if (avatarReponse.data.values && avatarReponse.data.values.length > 0) {
//                 profile.largePictureUrl = avatarReponse.data.values[0];
//             }
//             return Parse.Promise.as(profile);
//         }).then(function(profile) {
//             var query = new Parse.Query(Parse.User);
//             query.equalTo('li_uid', profile.id);
//             return Parse.Promise.when(query.find(), profile);
//         }).then(function(users, profile) {
//             var responseObj = { isNewUser: true };
//             if (users.length > 0 ) {
//                 var user = users[0];
//                 user.set('profileHeadline', profile.headline);
//                 user.set('profileLocationName', profile.location.name);
//                 user.set('publicProfileUrl', profile.publicProfileUrl);
//                 user.set('li_profile', profile);
//                 user.set('profileImage', profile.pictureUrl);
//                 user.set('profileImageLarge', profile.largePictureUrl);
//                 responseObj.isNewUser = false;
//             } else {
//                 var user = new Parse.User();
//                 user.set('email', profile.emailAddress);
//                 user.set('li_uid', profile.id);
//                 user.set('firstName', profile.firstName);
//                 user.set('lastName', profile.lastName);
//                 user.set('profileImage', profile.pictureUrl);
//                 user.set('profileImageLarge', profile.largePictureUrl);
//                 user.set('profileHeadline', profile.headline);
//                 user.set('profileLocationName', profile.location.name);
//                 user.set('publicProfileUrl', profile.publicProfileUrl);
//                 user.set('li_profile', profile);
//                 user.set('username', profile.emailAddress);
//                 user.set('password', guid());
//             }
//             return Parse.Promise.when(user.save(), responseObj);
//         }).then(function(user, responseObj) {
//             responseObj.parseToken = user.getSessionToken();
//             response.success(responseObj);
//         }, function(errors) {
//             if (typeof errors[0] !== 'undefined' && errors[0].status == 401) {
//                 response.error(401);
//             } else {
//                 response.error('Authentication error');
//             }
//             console.log('Authentication error: ' + JSON.stringify(errors) + ' ' + JSON.stringify(request));
//         });
//     }
// });
//
// var guid = (function() {
//   function s4() {
//     return Math.floor((1 + Math.random()) * 0x10000)
//         .toString(16)
//         .substring(1);
//   }
//   return function() {
//     return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
//         s4() + '-' + s4() + s4() + s4();
//   };
// })();
//
// Parse.Cloud.define("get_meetup_events", function(request, response) {
//     Parse.Cloud.useMasterKey();
//     var location = request.params.location;
//     var mlsFromEpoch = request.params.dateNumber;
//     var offset = request.params.offset;
//
//     if (!location) {
//         response.error('Field location must be supplied');
//     } else {
//         var lat = location.latitude;
//         var lon = location.longitude;
// 		Parse.Cloud.httpRequest({
//             url: 'https://api.meetup.com/2/open_events?lat='+lat+'&lon='+lon+'&page=20&offset='+offset+'&time='+mlsFromEpoch+',&fields=trending_rank,group_photos,venue,lat,lon&key=2e26e2b7d4e44642c5b71d46123c21',
//             headers:{
//                 'Content-Type': 'application/json'
//         }}).then(function(meetupsResponce) {
//
// 	        var responseArray = meetupsResponce['data']['results'];
// 	        var results = [];
//
// 	    	for (var i = 0; i < responseArray.length; i++) { // process objects only with coordinates and photo
// 	    		var element = responseArray[i];
// 	    		var venue = element['venue'];
// 	    		if (!!venue && !!element.group.photos[0] && !!venue.lat && !!venue.lon) {
// 	    			results.push(element);
// 	    		}
// 	    	}
//
// 	        var promises = _.map(results, function(result) {
//
// 	        	var id = result['id'];
// 	        	var query = new Parse.Query('Meetup');
// 	        	query.equalTo('meetupId', id);
//
// 	        	return query.find().then(function(searchResults) {
//
// 	        		if (searchResults.length > 0) { // Meetup already exists in database
//
// 	        			var meetup = searchResults[0];
// 	        			meetup.set('title', result.name);
// 	        			meetup.set('desc', result.description);
// 	        			meetup.set('distance', result.distance);
// 	        			meetup.set('groupTitle', result.group.name);
// 	        			meetup.set('eventUrl', result.event_url);
//
// 	        			// time
//
// 	        			var timeInt = parseInt(result.time);
// 	        			var offsetInt = parseInt(result.utc_offset);
// 	        			var resultInt = timeInt + offsetInt;
// 	        			var time = new Date(resultInt);
// 	        			meetup.set('time', time);
//
// 	        			// duration
//
// 	        			var duration = 10800000; // default is 3 hours
// 	        			if (!!result.duration) {
// 		        			duration = result.duration;
// 	        			}
// 	        			meetup.set('duration', duration);
//
// 	        			// photo
//
// 	        			if (!!result.group.photos[0]) {
// 			        		var photoUrl = result.group.photos[0].photo_link;
// 	        				meetup.set('photoUrl', photoUrl);
// 	        			}
//
// 	        			// location
//
// //	        			var venue = result['venue'];
// //
// //	        			if (!!venue) {
// //		        			meetup.set('venue', venue.name);
// //	        				var address = venue.address_1;
// //	        				var city = venue.city;
// //	        				if (!!address && !!city) {
// //		        				meetup.set('address', address + ' , ' + city);
// //	        				}
// //	        			}
//
// 	        		} else { // Create new Meetup
//
// 	        			var meetup = new Parse.Object("Meetup");
// 	        			meetup.set('meetupId', id);
// 	        			meetup.set('title', result.name);
// 	        			meetup.set('desc', result.description);
// 	        			meetup.set('distance', result.distance);
// 	        			meetup.set('groupTitle', result.group.name);
// 	        			meetup.set('eventUrl', result.event_url);
//
// 	        			// time
//
// 	        			var timeInt = parseInt(result.time);
// 	        			var offsetInt = parseInt(result.utc_offset);
// 	        			var resultInt = timeInt + offsetInt;
// 	        			var time = new Date(resultInt);
// 	        			meetup.set('time', time);
//
// 	        			// duration
//
// 	        			var duration = 10800000; // default is 3 hours
// 	        			if (!!result.duration) {
// 	        				duration = result.duration;
// 	        			}
// 	        			meetup.set('duration', duration);
//
// 	        			// photo
//
// 	        			if (!!result.group.photos[0]) {
// 							var photoUrl = result.group.photos[0].photo_link;
//         					if (!!photoUrl) {
//         						meetup.set('photoUrl', photoUrl);
//         					}
// 	        			}
//
// 	        			// location
//
// 	        			var venue = result['venue'];
// 	        			var point = new Parse.GeoPoint({latitude: venue.lat, longitude: venue.lon});
// 	        			meetup.set('location', point);
// 	        			meetup.set('venue', venue.name);
// 	        			var address = result.venue.address_1;
// 	        			var city = result.venue.city;
// 	        			if (!!address && !!city) {
// 		        			meetup.set('address', address + ' , ' + city);
// 	        			}
// 	        		}
//
// 	        		return meetup.save();
//
// 				}, function (error) {
// 		    		response.error("meetup fetch failed with error.code: " + error.code + " error.message: " + error.message);
// 	    		});
// 			});
//
// 		return Parse.Promise.when(promises).then(function() {
//
// 			var meetups = [];
// 	    	for (var i = 0; i < arguments.length; i++) {
// 	    		var argument = arguments[i];
// 	        	meetups.push(argument);
// 	  		}
//
// 	    	response.success({
// 		    	meetups: meetups
// 	  		});
// 		});
//     	}, function(error) {
//         	response.error(error);
//     	});
//     }
// });
