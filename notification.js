//TODO - tests https://github.com/acvetkov/sinon-chrome , https://github.com/Automattic/expect.js
//
var timetable = null;
var terms = null;
var minutesBefore = 5;
var GoogleCal = null;

// dec2hex :: Integer -> String
function dec2hex (dec) {
    return ('0' + dec.toString(16)).substr(-2)
}

// generateId :: Integer -> String
function generateId (len) {
    var arr = new Uint8Array((len || 40) / 2)
    window.crypto.getRandomValues(arr)
    return Array.from(arr, dec2hex).join('')
}


function lessonAlarm(alarm) {
    chrome.storage.sync.get({"minutes": 5}, function(result) {
        minutesBefore = result.minutes;
        if (alarm.name.startsWith("daily")) {  //ignore the daily housekeeping alarm
            return;
        }
        console.log("Got an alarm!", alarm);
        if (alarm.scheduledTime < Date.now() - minutesBefore * 60000) {
            console.log("alarm from the past; ignoring");
            return;
        }
        var opt = {
            type: "basic",
            title: alarm["name"].split(":", 1)[0],  // remove UUID-ish thing in alarm name
            message: "Class ends soon",
            iconUrl: "ttalert-48.png"
        };
        chrome.storage.local.get({"globalEnable": true}, function(result) {
            if(result.globalEnable){
                chrome.notifications.create(opt);
            }else{
                console.log("global Enable flag is false; ignoring alarm")
            }

        })
    })
}

function isDuringTerm(terms, date=null){ //date needs to be a Date type
    if(!date){
        date = new Date()
    }
    for(let i=1; i< terms.length; i++) { // start at 1 to ignore header row
        let start = new Date(terms[i][1] + "T00:00:00")
        let end = new Date(terms[i][2] + "T23:59:59")
        if(start <= date && date <= end){
            return true
        }
    }
    return false
}

function setAlarmsFromTimetable(timetable, terms){
    if(! isDuringTerm(terms)){
        console.log("not in term - having a holiday")
        return
    }

    chrome.storage.sync.get({"minutes": 5}, function(result){
        minutesBefore = result.minutes;

        for(let i=1; i< timetable.length; i++) { // start at 1 to ignore header row
            if(timetable[i][1] == "Y"){
                let d = new Date();
                let time = timetable[i][3].split(":");
                d.setHours(time[0]);
                d.setMinutes(time[1]);
                d.setSeconds(0,0);
                chrome.alarms.create(timetable[i][0], {when: d.getTime() - minutesBefore*60000})
            }
        }
        chrome.alarms.getAll(function(alarms){ console.log(alarms) })
    });
}

// Set a daily alarm at midnight
function createDailyAlarm(){
    var today = new Date();
    today.setHours(24, 0, 0, 0);
    chrome.alarms.create("daily", {when: today.getTime(), periodInMinutes: 60 * 24})
}

function dailyAlarm(alarm) {
    if (alarm.name == "daily") {
        console.log("Got daily alarm")
        // chrome.storage.local.get({lastUpdated: 0}, function (result) {
        //     if (result.lastUpdated > Date.now() - (24 * 60 * 60 * 1000 - 60000)) {
        //         console.log("last Updated", result.lastUpdated)
        //         console.log("Date now:", Date.now())
        //         console.log("daily alarm updated within last 24 hours; ignoring")
        //     } else {
                clearAndUpdate()
        //     }
        //})
    }else if(alarm.name == "daily-retry"){
        console.log("Retrying Daily")
        clearAndUpdate()
    }
}

function clearAndUpdate() {
    console.log('clearAndUpdate')
    chrome.alarms.clearAll(function (wasCleared) {
        setTimeout(function(){  //delay by one second to prevent race condition
            createDailyAlarm()
            updateAlarms()
        }, 1000)
    })
}


//TODO - split out auth, spreadsheet, and cal into seperate functions
function updateAlarms(){
    console.log("updateAlarms")
    // update times from sheet/cal
    try {
        chrome.identity.getAuthToken({interactive: true}, function (token) {
            if (!token) {  // couldn't get auth token - possibly no network connection. Try again in 5 minutes
                chrome.alarms.create("daily-retry", {when: Date.now() + 5 * 60 * 1000})
                // TODO - set limit on how many times to do this?
                // TODO - raise alert to user that we haven't updated?
            }
            let init = {
                method: 'GET',
                async: true,
                headers: {
                    Authorization: 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                'contentType': 'json'
            };
            chrome.storage.sync.get({"timetableSource": "spreadsheet"}, function (items) {
                switch (items['timetableSource']) {
                    case 'spreadsheet':
                        let today = (new Date()).getDay()
                        if(today == 0 || today == 6){ //don't add alarms for Saturday or Sunday
                            console.log('weekend; having a rest')
                            return
                        }
                        chrome.storage.sync.get(["sheet"], function (items) {
                            if (!items.sheet) {
                                //TODO - show alert or options page as we haven't got a sheet configured
                                return
                            }
                            let sheetID = items.sheet.match(/[-\w]{25,}/);  //get just the ID part of the supplied URL
                            let sheetAPIURL = 'https://sheets.googleapis.com/v4/spreadsheets/' + sheetID + '/values/Sheet1!A:I'
                            fetch(sheetAPIURL, init)
                                .then((response) => response.json())
                                .then(function (data) {
                                    let timetable = []
                                    let terms = []
                                    data['values'].forEach(function (row) {
                                        timetable.push(row.slice(0, 4))
                                        terms.push(row.slice(6, 9))
                                    })
                                    chrome.storage.sync.set({"timetable": timetable})
                                    chrome.storage.sync.set({"terms": terms})
                                    setAlarmsFromTimetable(timetable, terms)
                                    chrome.storage.local.set({lastUpdated: Date.now()})
                                }).catch(function (error) { // can't get from sheets, use storage instead without updating
                                chrome.storage.sync.get(["timetable", "terms"], function (items) {
                                    let timetable = items.timetable;
                                    let terms = items.terms;
                                    setAlarmsFromTimetable(timetable, terms)
                                    chrome.storage.local.set({lastUpdated: Date.now()})
                                })
                            })
                        })
                        break
                    case 'calendar':
                        chrome.storage.sync.get(['calendar', 'minutes'], function(result){
                            if(result.calendar){
                                GoogleCal = result.calendar;
                            }
                            if(result.minutes){
                                minutesBefore = result.minutes;
                            }
                            let now = new Date();
                            let tomorrow = new Date();
                            tomorrow.setHours(tomorrow.getHours() + 24, 0, 0)  // set to midnight
                            fetch('https://www.googleapis.com/calendar/v3/calendars/' + GoogleCal + '/events?timeMin=' + now.toISOString() + '&timeMax=' + tomorrow.toISOString(), init)
                                .then((response) => response.json())
                                .then(function (data) {
                                    if(data && data['items']) {
                                        data['items'].forEach(function (lesson) {
                                            console.dir(lesson)
                                            var lessonTime = new Date()  //today's date - need this for calendar events which appear as recurring events as they have the very first date as their date value
                                            var calTime = new Date(lesson['end']['dateTime'])
                                            lessonTime.setHours(calTime.getHours(), calTime.getMinutes(), calTime.getSeconds())
                                            lessonTime.setMinutes(lessonTime.getMinutes() - minutesBefore)
                                            var name = lesson['summary'] + ":" + generateId(20) //add UUID-ish thing to alarm name
                                            chrome.alarms.create(name, {when: lessonTime.getTime()})
                                            chrome.storage.local.set({lastUpdated: Date.now()})
                                        })
                                    }
                                })
                                .catch(function(err){
                                    //TODO something went wrong grabbing calendar data
                                })

                        })
                        break
                }
            })
        });
    }catch(err){ //try to catch network errors
        console.log(err)
        chrome.alarms.create("daily-retry", {when: Date.now() + 5 * 60 * 1000})
        // TODO - set limit on how many times to do this?
        // TODO - raise alert to user that we haven't updated?
    }
}

chrome.alarms.onAlarm.addListener(dailyAlarm);
chrome.alarms.onAlarm.addListener(lessonAlarm);
clearAndUpdate() //This should run when the browser is started/extension is loaded

//console.log("new daily created")
//chrome.alarms.getAll(function(alarms){ console.log(alarms) })

chrome.runtime.onInstalled.addListener(function(details){
    if(details.reason == 'install'){  // first install
        try {
            chrome.identity.getAuthToken({interactive: true}, function (token) {
                if (!token) {  // couldn't get auth token
                    chrome.notifications.create({
                        type: "basic",
                        title: "Timetable Notifier",
                        message: "Something went wrong authorizing you. Please go the the extension settings page another time.",
                        iconUrl: "ttalert-48.png"
                    })
                }

                chrome.notifications.create({
                    type: "basic",
                    title: "Timetable Notifier",
                    message: "Notifications will appear like this. Please set up your options on the options page.",
                    iconUrl: "ttalert-48.png"
                })
                chrome.runtime.openOptionsPage()
            })

        }catch{
            chrome.notifications.create({
                type: "basic",
                title: "Timetable Notifier",
                message: "Something went wrong authorizing you. Please go the the extension settings page another time.",
                iconUrl: "ttalert-48.png"
            })

        }
    } else if (details.reason == 'update'){
        chrome.notifications.create({
            type: "basic",
            title: "Timetable Notifier",
            message: "Extension has been updated - there is now an on/off switch if don't want notifications off (e.g. you've got a day off)",
            iconUrl: "ttalert-48.png"
        })
    }
})




