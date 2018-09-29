function showAlarms(){
    let alarmslist = document.getElementById("alarms")
    chrome.alarms.getAll(function(alarms){
        alarms.forEach(function(alarm){
            var p = document.createElement("p");
            if(alarm.name != 'daily') {
                let name = alarm.name.split(":", 1)[0]
                p.appendChild(document.createTextNode(name + " " + new Date(alarm.scheduledTime)));
                alarmslist.appendChild(p);
            }
        })
        if(alarmslist.childElementCount == 1){  //only heading is there; ignore the whole div
            alarmslist.hidden = true;
        }
    })
}


document.addEventListener('DOMContentLoaded', showAlarms);
document.getElementById('settingsButton').addEventListener('click', function(){chrome.runtime.openOptionsPage()});
