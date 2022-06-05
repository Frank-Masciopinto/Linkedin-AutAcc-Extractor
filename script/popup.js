let api_ce_login = "https://api.bextra.io/ce/login";

document.addEventListener('DOMContentLoaded', restore_options());
document.getElementById('loginbtn').addEventListener('click', login);

// Saves options to chrome.storage
function save_options(_name, _regkey, _userid, _li_user, _li_pwd, _li_member_id, _site_url) {
    chrome.storage.local.set({
        ce_reg_key: _regkey,
		name: _name,
		user_id: _userid,
		li_user: _li_user,
		li_pwd: _li_pwd,
		li_member_id: _li_member_id,
		site_url: _site_url
    }, function () {
        // Update status to let user know options were saved.
        var status = document.getElementById('status');
        status.textContent = 'Successfully identified.';
        setTimeout(function () {
            status.textContent = '';
			restore_options();
        }, 2000);
    });
}
function logout() {
console.log("logout()");
	chrome.storage.local.set({
        ce_reg_key: null
    }, function () {
		restore_options();
	});
}
// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
    chrome.storage.local.get(["ce_reg_key", "user_email", "name"], function (item) {
		let ologin = document.getElementById("login");
		let ostatus = document.getElementById('status');
		let rkey = document.getElementById("regkey");
		if(item) {
			if(item.user_email) {
				document.getElementById("email").value = item.user_email;
			}
			if(!item.ce_reg_key) {
				ologin.setAttribute("style", "display:block");
				rkey.setAttribute("style", "display: none");
				ostatus.textContent = "Identify your CE using your email address and password";
			}
			else {
				ologin.setAttribute("style", "display:none");
				rkey.innerHTML = '<div class="space-evenly-flex flex-wrap"><div class="left" style="width:80%">Hi ' + item.name + '<br/><label>Reg Key: </label>' + item.ce_reg_key + '</div>' +
							'<div class="right" style="width:20%"><img id="logout" style="cursor: pointer;width:15px;" src="../images/logout.png"/></div></div>';
				rkey.setAttribute("style", "display: block");
				ostatus.textContent = "Ohh mama .. we are rolling!";
				const btn = document.getElementById("logout").addEventListener('click',logout);
			}
		}
		else {
			ologin.setAttribute("style", "display:block");
			rkey.setAttribute("style", "display: none");
		}
    });
}
async function save_credentials(cemail) {
	chrome.storage.local.set({
        user_email: cemail
    }, function () {
		return;
	});
}
async function login() {
	let cemail = document.getElementById("email").value;
	let cpwd = document.getElementById("upwd").value;
	save_credentials(cemail);
	
    var xhr = new XMLHttpRequest();
    xhr.open("POST", api_ce_login);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
        if (this.readyState === XMLHttpRequest.DONE) {
			if (this.status === 200 && xhr.response == "") {
				console.log("API response is empty, No New Email Campaign to Send");
				alert("API response is empty, No New Email Campaign to Send");
			} 
			else if (this.status === 200 && xhr.response) {
				let obj = JSON.parse(xhr.response);

				let promis = new Promise((res, rej) => {
					if (obj.length > 0) {
						save_options(obj[0].full_name, 
									 obj[0].reg_key,
									 obj[0].user_id,
									 obj[0].li_user,
									 obj[0].li_pwd,
									 obj[0].li_member_id,
									 obj[0].site_url
									 );
					}
					res();
				});
			}
			else {
				alert("ERROR");
			}
        }
		
    };
    xhr.send(JSON.stringify({"useremail": cemail, "userpwd": cpwd}));
}
