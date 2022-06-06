const LS = {
    getAllItems: () => chrome.storage.local.get(),
    getItem: async key => (await chrome.storage.local.get(key))[key],
    setItem: (key, val) => chrome.storage.local.set({[key]: val}),
    removeItems: keys => chrome.storage.local.remove(keys),
  };
console.log("Bexten Content Script INJECTED!")
let linked_login_url = "https://www.linkedin.com/checkpoint/rm/sign-in-another-account?fromSignIn=true&trk=guest_homepage-basic_nav-header-signin";

async function update_LS() {
    await LS.setItem("extracting_automatically_Bool", "false");
}
update_LS()

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    console.log("chrome.runtime.onMessage.addListener((request, sender, sendResponse) ==> ", request);
    if (request.message === "Extract-Next-Pages") {
        console.log("One message received", request);
        window.scrollBy({
            top: 10000,
            left: 100,
            behavior: 'smooth'
        });
        extract_All_leads(request.number_of_pages, true);
    } else if (request.message === 'are_you_there_content_script?') {
        sendResponse({
            status: "yes"
        });
    } else if (request.message === 'Page scrolled by user, add more buttons!') {
        console.log(request);
        console.log(await LS.getItem("extracting_automatically_Bool"));
        if (await LS.getItem("extracting_automatically_Bool") == "True") {}
        else {
            console.log("adding extra buttons!");
            add_extra_Buttons();
        }
    }
});

function do_i_need_to_login_first(memberid) {
	let doexists = Array.from(document.querySelectorAll("code")).find(function(item) { return String(item.textContent).match(/member:memberid/); });
    console.log("Is it the correct user on linkedin? ", (doexists?'YES':'nooooo'));
	if(!doexists) {
		// Sign out first
		/*******************************************************************/
		/*	You need first to Signout from Linkedin, and only then login
		/*******************************************************************/
		
		/*******************************************************************/
		//Login
		//	Injecting a 'login' code to the specific tab. In it we need to login 
		// Window will be closed at the end
		chrome.tabs.create({url: linked_login_url}, function(tab) {
			chrome.scripting.executeScript({
			  target: {tabId: tab.id},
			  files: ['./script/linkedin_login.js']
			})
			.catch(err => console.log(err));
		});
		/*******************************************************************/
		/** Open LinkedIn tab (now that we have the right linkedin user) and inject linkedin_scrapper.js
		/*******************************************************************/
		self.reload();
		
	}
}
function insertAfter(newElement, referenceElement) {
    referenceElement.parentNode.insertBefore(newElement, referenceElement.nextSibling);
};

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function add_extra_Buttons() {
    console.log("add_extra_Buttons()");
    all_people = document.querySelectorAll("li.grid");
    for (i = 0; i < all_people.length; ++i) {
        let lead_link;
        contact_to_add_Button = all_people[i].querySelector("div[type='circle']");
        try {
            lead_link = contact_to_add_Button.querySelector("a").href;
            var new_Button = document.createElement("button");
            let id_increase = "Linkedin_Extractor_Button" + i;
            new_Button.id = id_increase;
            new_Button.classList.add("button-Linkedin");
            new_Button.innerHTML = "Get Lead Info";
            new_Button.addEventListener("click", function () {
                window.open(lead_link + "?one_cont=", "mine", "height=100,width=200");
            })
            if (all_people[i].getElementsByClassName("button-Linkedin").length !== 0) {}
            else {
                insertAfter(new_Button, contact_to_add_Button);
            }
        } catch {
            lead_link = null;
        }
    }
}

function extract_Company_Information() {
    console.log("extract_Company_Information()");
    let wait_time_human_simulation;
    let dom_txt = document.body.textContent
        let company_name;
    let overview;
    let industry;
    let website;
    let company_followers;
    let company_Linkedin_Url;
    let company_Logo;
    let company_Headquarter;
    let company_Founded;
    let company_Size;
    let company_Phone;
    let company_Street_Address = [];
    let check_name;

    let no_value = "null";
    try {
        company_name = document.querySelector("span[dir='ltr']").innerText;
    } catch {
        company_name = no_value;
    }
    try {
        overview = document.querySelector("section > .break-words").innerText;
    } catch {
        overview = no_value;
    }
    try {
        industry = document.querySelectorAll(".org-top-card-summary-info-list__info-item")[0].innerText;
    } catch {
        industry = no_value;
    }
    try {
        let all_address_Containers = document.querySelectorAll("a[href^='https://www.bing.com'].ember-view");
        for (let i = 0; i < all_address_Containers.length; i++) {
            company_Street_Address.push(all_address_Containers[i].previousElementSibling.innerText + "; ");
        }
    } catch {}
    try {
        company_followers = document.querySelectorAll(".org-top-card-summary-info-list__info-item")[2].innerText;
    } catch {
        company_followers = no_value;
    }
    try {
        company_Phone = document.querySelector("a[href^='tel:']").href.substring(4, )
    } catch {
        company_Phone = no_value
    }

    try {
        //Search for company Headquarter + Founded + Website
        let container_Headquarter_Founded = document.querySelectorAll(".mb1");
        for (var i = 0; i < container_Headquarter_Founded.length; i++) {
            if (container_Headquarter_Founded[i].textContent.includes("Headquarters")) {
                company_Headquarter = container_Headquarter_Founded[i].nextElementSibling.innerText;
            } else if (container_Headquarter_Founded[i].textContent.includes("Founded")) {
                company_Founded = container_Headquarter_Founded[i].nextElementSibling.innerText;
            } else if (container_Headquarter_Founded[i].textContent.includes("Website")) {
                website = container_Headquarter_Founded[i].nextElementSibling.innerText;
            }
        }
        if (company_Headquarter == undefined) {
            company_Headquarter = no_value;
        }
        if (company_Founded == undefined) {
            company_Founded = no_value;
        }
        if (website == undefined) {
            website = no_value;
        }
        // END search company Headquarter + Founded
    } catch {
        company_Headquarter = no_value;
        company_Founded = no_value;
        website = no_value;
    }
    try {
        //Search for company size REGEX
        let container_size = document.querySelectorAll("dd");
        for (var i = 0; i < container_size.length; i++) {
            if (container_size[i].textContent.includes("on LinkedIn")) {
                let size_txt = container_size[i].innerText;
                company_Size = size_txt.match(/.+?(?= on LinkedIn)/)[0];
                break;
            }
        }
        // END search company size
    } catch {
        company_Size = no_value;
    }
    company_Linkedin_Url = document.URL;
    try {
        company_Logo = document.querySelector(".org-top-card-primary-content__logo-container").firstElementChild.src;
    } catch {
        company_Logo = "null";
    }

    let record = {
        "Name": company_name,
        "Description": overview,
        "Industry": industry,
        "Company_Domain": website,
        "Company_size": company_Size,
        "Address": company_Headquarter,
        "Year_founded": company_Founded,
        "LinkedIn_page": company_Linkedin_Url,
        "Followers": company_followers,
        "Phone": company_Phone,
        "Email": no_value,
        "Company_Facebook": no_value,
        "Company_Instagram": no_value,
        "Company_Twitter": no_value,
        "Logo": company_Logo,
        "Company_Street_Address": company_Street_Address
    };
    dom_txt = "";
    let company_home_URL = document.URL.replace("about/", "")
    if (window.name == "autoCompany") {
        wait_time_human_simulation = getRandomInt(7) * 1000;
        console.log(wait_time_human_simulation);
        setTimeout(() => {
            chrome.runtime.sendMessage({
                message: "AUTOLIST_COMPANY_fetch_phone",
                payload: record
            });
            window.close();
        }, wait_time_human_simulation);
    } 
    else if (document.URL.includes("?aut_acc")) {
        wait_time_human_simulation = getRandomInt(7) * 1000;
        setTimeout(() => {
            chrome.runtime.sendMessage({
                message: "Automation_Extracted_ACCOUNT",
                payload: record
            });
            window.close();
        }, wait_time_human_simulation);
    } else {
        chrome.runtime.sendMessage({
            message: "fetch_phone",
            payload: record
        });
    }
}

async function extract_Contact_Information(all_leads) {
    console.log("extract_Contact_Information(all_leads): ", all_leads);
    let connect_Message;
    let send_message_bool;
    let connect_Company_Name;
    if (all_leads == "Autolist-Contact") {
        chrome.runtime.sendMessage({
            message: "Connect?"
        }, function (response) {
            if (response.answer == false) {
                connect_Message = null;
                send_message_bool = false;
            } else {
                connect_Message = response.answer;
                connect_Company_Name = response.company_Name;
                send_message_bool = true;
            }
        });
    } else {
        //If manually visiting the contact page, dont connect automatically
        connect_Message = null;
        send_message_bool = false;
    }
    let wait_time_human_simulation;
    let first_Name;
    let last_name;
    let picture_url;
    let linkedin_page;
    let headline;
    let languages;
    let current;
    let job_title;
    let start_date;
    let end_date;
    let company_linkedin_page;
    let company_name;
    let company_logo_url;
    let work_full_address;
    let person_full_Address;
    let experience = [];
    let number_of_Job_Positions_in_Company = [];

    let full_Name = document.querySelector("h1").innerText;
    try {
        var lastIndex = full_Name.lastIndexOf(" ");
        first_Name = full_Name.substring(0, lastIndex);
        last_name = full_Name.split(" ").pop();
    } catch {
        first_Name = full_Name;
    }
    try {
        picture_url = document.querySelector("button>img[width='200']").src;
    } catch {
        picture_url = null;
    }
    if (all_leads == "one") {
        linkedin_page = document.URL.replace("?one_cont=", "");
    } else if (all_leads == "true") {
        linkedin_page = document.URL.replace("?extr_id=", "");
    } else if (all_leads == "false") {
        linkedin_page = document.URL;
    } else if (all_leads == "?newauto") {
        linkedin_page = document.URL.replace("?newauto", "");
    } else if (document.URL.includes("?sin_acc")) {
        linkedin_page = document.URL;
    } else if (all_leads == "Employees-Enrichment") {
        linkedin_page = document.URL;
    }

    //ADDRESS
    try {
        person_full_Address = document.querySelector("a[href$='contact-info/']").parentElement.previousElementSibling.innerText;
    } catch {
        person_full_Address = null;
    }

    //ABOUT
    try {
        headline = document.querySelector(".pv-top-card").querySelector(".mt2").firstElementChild.lastElementChild.innerText;
        if (headline.includes("Talks about")) {
            headline = document.querySelector(".pv-top-card").querySelector(".mt2").firstElementChild.children[1].innerText;
        }
    } catch {
        headline = null;
    }

    //LANGUAGES
    try {
        languages = document.querySelector("div[aria-labelledby='languages-title']").innerText.split(" ");
    } catch {
        languages = null;
    }
    async function check_If_Experience_Exist() {
        console.log("CHECKING IF EXPERIENCE EXIST");
        return new Promise((res, rej) => {
            let exp_section_obj = document.querySelector("section>div#experience");
            if (exp_section_obj != null) {
                res(exp_section_obj);
            } else {
                res(null);
            }
        })
    }

    //EXPERIENCE

    async function iteration(all_work_Experience_Containers) {
        console.log("Inside iteration - Work Experience Containers List Below");
        console.log(all_work_Experience_Containers);
        for (let i = 0; i < all_work_Experience_Containers.length; i++) {
            //If Job Jontainer contains multiple positions
            if (all_work_Experience_Containers[i].querySelectorAll("li[class=' ']").length > 1) {
                if (all_work_Experience_Containers[i].querySelector("li").querySelector(".mr1")) {
                    console.log("Fetching MULTIPLE POSITION EXPERIENCE");
                    const data = await fetch_multiple_work(all_work_Experience_Containers[i]);
                } else {
                    console.log("Fetching **else** SINGLE POSITION EXPERIENCE");
                    const data = await fetch_single_work(all_work_Experience_Containers[i]);
                }
            }
            //Else fetch single position
            else {
                console.log("Fetching SINGLE POSITION EXPERIENCE");
                const data = await fetch_single_work(all_work_Experience_Containers[i]);
            }
        }
    }
    function clean_json_for_position(company_name, company_LI, company_logo, job_title, current, start_date,
        end_date, address, description) {
        let position = {
            "company_linkedin_page": company_LI,
            "company_name": company_name,
            "company_logo_url": company_logo,
            "description": description,
            "job_title": job_title,
            "current": current,
            "start_date": start_date,
            "end_date": end_date,
            "full_address": address
        };
        for (key in position) {
            if (position[key] == null) {
                delete position[key];
            }
        }
        return position;
    }
    async function fetch_multiple_work(work_container) {
        let m_company_linkedin_page;
        let m_company_name;
        let m_company_logo_url;
        let m_description;
        return new Promise((res, rej) => {
            //fetch company data
            try {
                m_company_linkedin_page = work_container.querySelector("a[href^='/company/']").href;
            } catch {
                m_company_linkedin_page = null;
            }
            try {
                m_company_logo_url = work_container.querySelector("a[href^='/company/']").firstElementChild.firstElementChild.firstElementChild.src;
            } catch {
                m_company_logo_url = null;
            }
            //Fetch ALL job positions within same company
            async function fetch_single_Position_For_Loop() {
                for (let i = 0; i < all_Job_Position_Containers.length; i++) {
                    const data = await fetch_single_Job_Position_Data(all_Job_Position_Containers[i]);
                }
            }
            async function fetch_single_Job_Position_Data(job_container) {
                return new Promise((res, rej) => {
                    let m_job_title;
                    let m_start_date;
                    let m_work_full_address;
                    let m_current;
                    let m_end_date;
                    try {
                        m_job_title = job_container.innerText.replace("Title\n", "");
                    } catch {
                        m_job_title = null;
                    }

                    //WORK LOCATION LOOKUP + START END DATE
                    let container_all_position_details = job_container.getElementsByClassName("visually-hidden");
                    for (let i = 0; i < container_all_position_details.length; i++) {
                        for (let i = 0; i < container_all_position_details.length; i++) {
                            if (container_all_position_details[i].parentElement.parentElement.getAttribute("class").includes("pv-shared-text-with-see-more")) {
                                s_description = container_all_position_details[i].innerText;
                            } else if (container_all_position_details[i].innerText.match(/ yrs | yr | mo | mos | yr| mo/)) {
                                let work_Dates_Array = container_all_position_details[i].innerText.split(" · ")[0].split(" - ");
                                s_start_date = work_Dates_Array[0];
                                s_end_date = work_Dates_Array[1];
                                if (s_end_date == "Present") {
                                    s_current = true;
                                } else {
                                    s_current = false;
                                }
                                let test_if_next_hidden_span_is_description;
                                try {
                                    let test_class_description_1 = !container_all_position_details[i + 1].parentElement.parentElement.getAttribute("class").includes("pv-shared-text-with-see-more");
                                    test_if_next_hidden_span_is_description = test_class_description_1;
                                } catch {
                                    test_if_next_hidden_span_is_description = false;
                                }
                                if (test_if_next_hidden_span_is_description == true) {
                                    s_work_full_address = container_all_position_details[i + 1].innerText;
                                }
                            }
                        }
                    }
                    experience.push(clean_json_for_position(m_company_name, m_company_linkedin_page,
                            m_company_logo_url, m_job_title, m_current, m_start_date,
                            m_end_date, m_work_full_address, m_description));
                    res();
                })
            }
            try {
                m_company_name = work_container.getElementsByTagName("h3")[0].innerText.replace("Company Name\n", "");
            } catch {
                m_company_name = null;
            }
            try {
                m_description = work_container.querySelector(".inline-show-more-text").innerText;
            } catch {
                m_description = null;
            }

            let all_Job_Position_Containers = work_container.querySelector("ul").getElementsByTagName("h3");
            fetch_single_Position_For_Loop();
            res();
        });
    }

    async function fetch_single_work(single_pos_obj) {
        let job_Positions = [];
        let s_current;
        let s_job_title;
        let s_start_date;
        let s_end_date;
        let s_company_linkedin_page;
        let s_company_name;
        let s_company_logo_url;
        let s_work_full_address;
        let s_description;

        return new Promise((res, rej) => {
            // try {
            let container_all_position_details = single_pos_obj.getElementsByClassName("visually-hidden");
            console.log("extracting single job");
            for (let i = 0; i < container_all_position_details.length; i++) {
                if (container_all_position_details[i].parentElement.parentElement.getAttribute("class").includes("pv-shared-text-with-see-more")) {
                    s_description = container_all_position_details[i].innerText;
                } else if (container_all_position_details[i].innerText.match(/ yrs | yr | mo | mos | yr| mo/)) {
                    let work_Dates_Array = container_all_position_details[i].innerText.split(" · ")[0].split(" - ");
                    s_start_date = work_Dates_Array[0];
                    s_end_date = work_Dates_Array[1];
                    if (s_end_date == "Present") {
                        s_current = true;
                    } else {
                        s_current = false;
                    }
                    let test_if_next_hidden_span_is_description;
                    try {
                        let test_class_description_1 = !container_all_position_details[i + 1].parentElement.parentElement.getAttribute("class").includes("pv-shared-text-with-see-more");
                        test_if_next_hidden_span_is_description = test_class_description_1;
                    } catch {
                        test_if_next_hidden_span_is_description = false;
                    }
                    if (test_if_next_hidden_span_is_description == true) {
                        s_work_full_address = container_all_position_details[i + 1].innerText;
                    }
                }
            }
            // }
            // catch {
            //     s_work_full_address = null
            //     s_start_date = null
            //     s_end_date = null
            // }
            try {
                s_job_title = single_pos_obj.querySelector(".mr1").innerText.match(/(?<=\n).*/)[0];
            } catch {
                s_job_title = null;
            }
            try {
                s_company_linkedin_page = single_pos_obj.querySelector("a").href;
            } catch {
                s_company_linkedin_page = null;
            }

            try {
                s_company_logo_url = single_pos_obj.querySelector("img").src;
            } catch {
                s_company_logo_url = null;
            }

            try {
                s_company_name = single_pos_obj.querySelector("span.t-14").innerText.match(/(?<=\n).*/)[0];
            } catch {
                s_company_name = null;
            }
            experience.push(clean_json_for_position(s_company_name, s_company_linkedin_page,
                    s_company_logo_url, s_job_title, s_current, s_start_date,
                    s_end_date, s_work_full_address, s_description));
            res();
        })
    }

    if (connect_Message != undefined || connect_Message != null) {
        // Replace Name / Last Name / Company for connect message if any
        connect_Message = connect_Message.replace("{{contact.first_name}}", first_Name);
        connect_Message = connect_Message.replace("{{contact.last_name}} ", last_name);
        connect_Message = connect_Message.replace("{{contact.company.name}}", connect_Company_Name);
    }
    let is_email;
    if (document.querySelector("a[href$='contact-info/']")) {
        is_email = "yes";
    } else {
        is_email = null;
    }
    setTimeout(function () {
        let user_record = {
            "first_name": first_Name,
            "last_name": last_name,
            "email": is_email,
            "msg_template": {
                connect_Message
            },
            "picture_url": picture_url,
            "send_connect_request": send_message_bool,
            "linkedin_page": linkedin_page,
            "full_address": person_full_Address,
            "about": headline,
            "languages": languages,
            "experience": experience
        }
        console.log(user_record);
        if (all_leads == "false") {
            chrome.runtime.sendMessage({
                message: "call_API_Contact",
                payload: user_record
            });
            document.querySelector("a[href$='contact-info/']").click();
        } else if (all_leads == "true") {
            chrome.runtime.sendMessage({
                message: "call_API_Contact_extract_Next_Lead",
                contact_info: user_record
            });
            try {
                document.querySelector("a[href$='contact-info/']").click();
            } catch {}
            setTimeout(function () {
                window.close();
            }, 3000);
        } else if (all_leads == "Employees-Enrichment") {
            chrome.runtime.sendMessage({
                message: "One_Contact_Enrichment_Extraction_Completed",
                contact_info: user_record
            });
            try {
                document.querySelector("a[href$='contact-info/']").click();
            } catch {}
            setTimeout(function () {
                window.close();
            }, 3000);
        } else if (all_leads == "Autolist-Contact") {
            wait_time_human_simulation = getRandomInt(7) * 1000;
            if (send_message_bool != false) {
                let connect_Promise = new Promise((res, rej) => {
                    // Connect Blue Button does exist
                    if (document.querySelector('[id="main"]').querySelector('[aria-label^="Invite"]') != null) {
                        console.log("Inside Blue Connect Button");
                        //Connect thru menu
                        document.querySelector('[id="main"]').querySelector('[aria-label^="Invite"]').click();
                        function send_message() {
                            document.querySelector('[aria-label^="Add a note"]').click();
                            setTimeout(() => {
                                document.querySelector('[name="message"]').value = connect_Message;
                                document.querySelector('[aria-label="Send now"]').disabled = false;
                                document.querySelector('[aria-label="Send now"]').click();
                                res();
                            }, 1500)
                        }
                        setTimeout(() => {
                            if (document.querySelector('[aria-label^="Add a note"]')) {
                                send_message()
                            }
                            else {
                                document.querySelector('[aria-label="Connect"]').click()
                                send_message()
                            }
                        }, 1000);
                    }
                    // If blue button does not exist, try menu 3 dots
                    else if (document.querySelector('[type="connect-icon"]') != null) {
                        console.log("Inside 3 dots menu for Connect");
                        //Connect thru menu
                        document.querySelector('[type="connect-icon"]').click();
                        setTimeout(() => {
                            if (document.querySelector('[aria-label^="Add a note"]') != null) {
                                document.querySelector('[aria-label^="Add a note"]').click();
                            }
                        }, 1000)
                        setTimeout(() => {
                            document.querySelector('[name="message"]').value = connect_Message;
                            document.querySelector('[aria-label="Send now"]').disabled = false;
                            document.querySelector('[aria-label="Send now"]').click();
                        }, 1500)
                        //Click connect
                        document.querySelector('[aria-label="Connect"]').click();
                        res();
                    } else {
                        res()
                    }
                }).then((res) => {
                    chrome.runtime.sendMessage({
                        message: "new_AUTO_Contact_Info_Fetched",
                        contact_info: user_record
                    });
                    window.open(document.URL.replace("?sin_acc", "") + "overlay/contact-info/", "Fetch-Exp", "height=100,width=200", "_blank");
                    setTimeout(function () {
                        setTimeout(function () {
                            window.close();
                        }, 3500);
                    }, wait_time_human_simulation);
                })
            } 
            else {
                setTimeout(() => {
                    chrome.runtime.sendMessage({
                        message: "new_AUTO_Contact_Info_Fetched",
                        contact_info: user_record
                    });
                    try {
                        window.open(document.URL.replace("?sin_acc", "") + "overlay/contact-info/", "Fetch-Exp", "height=100,width=200", "_blank");
                    } catch {
                        console.log("***CANNOT CLICK CONTACT INFO***");
                    }
                    setTimeout(function () {
                        window.close();
                    }, 3500);
                }, wait_time_human_simulation);
            }
        } else if (all_leads == "one") {
            chrome.runtime.sendMessage({
                message: "call_API_Contact",
                payload: user_record
            });
            try {
                document.querySelector("a[href$='contact-info/']").click();
            } catch {}
            setTimeout(function () {
                window.close();
            }, 3000);
        }
    }, 1500);
}
function scroll_pages_loop(number_pages_to_Scroll, old_count, resolve) {
    let new_count;
    let i = 1;
    var existCondition = setInterval(function () {
        new_count = document.querySelectorAll("li.grid ").length;
        if (i <= number_pages_to_Scroll && new_count > old_count) {
            old_count = new_count;
            console.log("Scrolling to number of pages selected");
            window.scrollBy({
                top: 10000,
                left: 100,
                behavior: 'smooth'
            });
            i += 1;
        }
        //All Contacts LISTED
        else {
            clearInterval(existCondition);
            return resolve("All contacts Loaded");
        }
    }, 4500);
}

function extract_All_leads(number_of_pages_to_scroll, extracting_More) {
    let link;
    old_count = document.querySelectorAll("li.grid ").length;
    let scroll_pages_Promise = new Promise(function (resolve, reject) {
        scroll_pages_loop(number_of_pages_to_scroll, old_count, resolve);
    });
    //After # pages are scrolled
    scroll_pages_Promise.then(function (value) {
        //collect all links container to lead linkedin page
        all_people = document.querySelectorAll("li.grid");
        all_leads_link_to_extract = [];
        //for each link, enter it in the array to be sent to background & extracted later
        let i;
        if (extracting_More == true) {
            i = old_count;
        } else {
            i = 0;
        }
        for (i; i < all_people.length; ++i) {
            try {
                link = all_people[i].querySelector("div[type='circle']").querySelector("a").href;
                all_leads_link_to_extract.push(link);
            } catch {}
        }
    }).then(function (result) {
        if (link != null) {
            chrome.runtime.sendMessage({
                message: "All_Leads_list",
                leads_list: all_leads_link_to_extract
            });
        } else {
            alert("No more leads to extract");
        }
    })
}

function add_Extract_People_Buttons(number_of_pages_to_scroll) {
    let all_people;
    let contact_to_add_Button;
    var get_All_Leads_Button;
    let add_All_Leads_Button_Promise = new Promise((resolve, reject) => {
        //Add Get All Leads Button
        var existCondition = setInterval(function () {
            let header_container_leads_list = document.querySelector("h4.t-20");
            if (header_container_leads_list != null) {
                clearInterval(existCondition);
                get_All_Leads_Button = document.createElement("button");
                get_All_Leads_Button.id = "Get_All_Leads";
                get_All_Leads_Button.classList.add("button-ALL-Linkedin");
                get_All_Leads_Button.innerHTML = "Get All Leads";
                get_All_Leads_Button.addEventListener("click", async function () {
                    await LS.setItem("extracting_automatically_Bool", "True");
                    window.scrollBy({
                        top: 10000,
                        left: 100,
                        behavior: 'smooth'
                    });
                    extract_All_leads(number_of_pages_to_scroll, false);
                })
                resolve(header_container_leads_list);
            }
            //All Contacts LISTED
            else {}
        }, 200);
    })
        add_All_Leads_Button_Promise.then((header_container_leads_list) => {
            if (header_container_leads_list.parentElement.getElementsByClassName("button-Linkedin").length !== 0) {}
            else {
                insertAfter(get_All_Leads_Button, header_container_leads_list);
            }
        })
        add_All_Leads_Button_Promise.then((res) => {
            //for each lead add a Extract button
            all_people = document.querySelectorAll("li.grid");
            for (i = 0; i < all_people.length; ++i) {
                let lead_link;
                contact_to_add_Button = all_people[i].querySelector("div[type='circle']");
                try {
                    lead_link = contact_to_add_Button.querySelector("a").href;
                    var new_Button = document.createElement("button");
                    let id_increase = "Linkedin_Extractor_Button" + i;
                    new_Button.id = id_increase;
                    new_Button.classList.add("button-Linkedin");
                    new_Button.innerHTML = "Get Lead Info";
                    new_Button.addEventListener("click", function () {
                        window.open(lead_link + "?one_cont=", "mine", "height=100,width=200");
                    })
                    if (all_people[i].getElementsByClassName("button-Linkedin").length !== 0) {}
                    else {
                        insertAfter(new_Button, contact_to_add_Button);
                    }
                } catch {
                    lead_link = null;
                }
            }
        })
}

function scroll_ALL_pages_loop(old_count, resolve) {
    let new_count;
    var existCondition = setInterval(function () {
        new_count = document.querySelectorAll("li.grid ").length;
        console.log("Scrolling until no more employees to display");
        if (new_count > old_count) { //&& old_count < 1force to stop at first iteration
            old_count = new_count;
            window.scrollBy({
                top: 10000,
                left: 100,
                behavior: 'smooth'
            });
        }
        //All Contacts LISTED
        else {
            clearInterval(existCondition);
            console.log("All pages scrolled");
            return resolve("All contacts Loaded");
        }
    }, 3500);
}

async function click(btn) {
    return new Promise((res, rej) => {
        btn.scrollIntoView();
        btn.click();
        btn.dispatchEvent(new MouseEvent('mousedown', {
                'bubbles': true
            }));
        btn.dispatchEvent(new MouseEvent('mouseup', {
                'bubbles': true
            }));
        res();
    })
}

async function click_see_more_buttons() {
    console.log("INSIDE SEE MORE")
    let experience_Section = document.querySelector("section>div#experience").parentElement;
    //get experience and select all Show More buttons
    let job_see_More_btns = experience_Section.querySelectorAll(".pv-profile-section__see-more-inline, .inline-show-more-text__button");
    console.log(job_see_More_btns);
    for (let i = 0; i < job_see_More_btns.length; i++) {
        await click(job_see_More_btns[i]);
    }
}

function extract_email() {
    let email;
    try {
        email = document.querySelector("a[href^='mailto:']").innerText;
    } catch {
        email = null;
    }
    return email;
}

async function extract_contact_experience() {
console.log("extract_contact_experience();");
    let experience = [];
    let all_work_Experience_Containers = document.querySelectorAll("li.pvs-list__item--line-separated");
console.log("extract_contact_experience() ==> all_work_Experience_Containers: ", all_work_Experience_Containers.length);
    iteration(all_work_Experience_Containers);

    async function iteration(all_work_Experience_Containers) {
        for (let i = 0; i < all_work_Experience_Containers.length; i++) {
            //If Job Container contains multiple positions
            if (all_work_Experience_Containers[i].querySelectorAll("li.pvs-list__paged-list-item").length > 0) {
console.log("Fetching MULTIPLE POSITION EXPERIENCE");
                const data = await fetch_multiple_work(all_work_Experience_Containers[i]);
console.log("extract_contact_experience() ==> data: ", data);
            }
            //Else fetch single position
            else {
console.log("Fetching SINGLE POSITION EXPERIENCE");
                const data = await fetch_single_work(all_work_Experience_Containers[i]);
console.log("extract_contact_experience() ==> data: ", data);
            }
        }
console.log("extract_contact_experience() ==> experience: ", experience);
        //send experience to background
        chrome.runtime.sendMessage({
            message: "Contact Experience Fetched",
            all_experience: experience
        });
        setTimeout(() => {
            window.close();
        }, 1400);
    }
    function clean_json_for_position(company_name, company_LI, company_logo, job_title, current, start_date,
        end_date, address, description) {
        let position = {
            "company_linkedin_page": company_LI,
            "company_name": company_name,
            "company_logo_url": company_logo,
            "description": description,
            "job_title": job_title,
            "current": current,
            "start_date": start_date,
            "end_date": end_date,
            "full_address": address
        }
        for (key in position) {
            if (position[key] == null) {
                delete position[key];
            }
        }
        return position;
    }
    async function fetch_multiple_work(work_container) {
        let m_company_linkedin_page;
        let m_company_name;
        let m_company_logo_url;
        let m_description;
        return new Promise((res, rej) => {
            //fetch company data
            try {
                m_company_linkedin_page = work_container.querySelector("a[href*='/company/']").href;
            } catch {
                m_company_linkedin_page = null;
            }
            try {
                m_company_logo_url = work_container.querySelector("img").src;
            } catch {
                m_company_logo_url = null;
            }
            //Fetch ALL job positions within same company
            async function fetch_single_Position_For_Loop(all_Job_Position_Containers) {
                for (let i = 0; i < all_Job_Position_Containers.length; i++) {
                    console.log("Inside loop extracting position");
                    const data = await fetch_single_Job_Position_Data(all_Job_Position_Containers[i]);
                }
                res();
            }
            async function fetch_single_Job_Position_Data(position_container) {
                return new Promise((resolve, rej) => {
                    let m_job_title;
                    let m_start_date;
                    let m_work_full_address;
                    let m_current;
                    let m_end_date;
                    try {
                        m_job_title = position_container.querySelector(".mr1").innerText.match(/(?<=\n).*/)[0];
                    } catch {
                        m_job_title = null;
                    }

                    //WORK LOCATION LOOKUP + START END DATE
                    let container_all_position_details = position_container.getElementsByClassName("visually-hidden");
                    if (position_container.querySelector(".pvs-list__item--with-top-padding")) {
                        m_description = position_container.querySelector(".pvs-list__item--with-top-padding").innerText;
                    }
                    for (let i = 0; i < container_all_position_details.length; i++) {
                        if (container_all_position_details[i].innerText.match(/ yrs | yr | mo | mos | yr| mo/)) {
                            let work_Dates_Array = container_all_position_details[i].innerText.split(" · ")[0].split(" - ");
                            if (m_start_date == null) {
                                console.log("Inside IF start date is null");
                                m_start_date = work_Dates_Array[0];
                                m_end_date = work_Dates_Array[1];
                                if (m_end_date == "Present") {
                                    m_current = true;
                                } else {
                                    m_current = false;
                                }
                                console.log(container_all_position_details[i].innerText);
                                if (container_all_position_details.length - i == 3) {
                                    m_work_full_address = container_all_position_details[i + 1].innerText;
                                }
                            }
                        }
                    }
                    experience.push(clean_json_for_position(m_company_name, m_company_linkedin_page,
                            m_company_logo_url, m_job_title, m_current, m_start_date,
                            m_end_date, m_work_full_address, m_description));
                    resolve();
                })
            }
            try {
                m_company_name = work_container.getElementsByClassName("mr1")[0].innerText.match(/(?<=\n).*/)[0];
            } catch {
                m_company_name = null;
            }
            let all_Job_Position_Containers = work_container.querySelectorAll("li.pvs-list__paged-list-item");
            console.log(all_Job_Position_Containers);
            fetch_single_Position_For_Loop(all_Job_Position_Containers);
        })
    }

    async function fetch_single_work(single_pos_obj) {
        let job_Positions = [];
        let s_current;
        let s_job_title;
        let s_start_date;
        let s_end_date;
        let s_company_linkedin_page;
        let s_company_name;
        let s_company_logo_url;
        let s_work_full_address;
        let s_description;

        return new Promise((res, rej) => {
            let container_all_position_details = single_pos_obj.getElementsByClassName("visually-hidden");
            console.log("extracting single job with - visually hidden loop");
            if (single_pos_obj.querySelector(".pvs-list__item--with-top-padding")) {
                s_description = single_pos_obj.querySelector(".pvs-list__item--with-top-padding").innerText;
            }
            for (let i = 0; i < container_all_position_details.length; i++) {
                if (container_all_position_details[i].innerText.match(/ yrs | yr | mo | mos | yr| mo |year/) && container_all_position_details[i].innerText.length < 50) {
                    let work_Dates_Array = container_all_position_details[i].innerText.split(" · ")[0].split(" - ");
                    if (s_start_date == null) {
                        s_start_date = work_Dates_Array[0];
                        s_end_date = work_Dates_Array[1];
                        if (s_end_date == "Present") {
                            s_current = true;
                        } else {
                            s_current = false;
                        }
                        if (container_all_position_details.length - i == 3) {
                            s_work_full_address = container_all_position_details[i + 1].innerText;
                        }
                    }
                }
            }
            // }
            // catch {
            //     s_work_full_address = null
            //     s_start_date = null
            //     s_end_date = null
            // }
            try {
                s_job_title = single_pos_obj.querySelector(".mr1").innerText.match(/(?<=\n).*/)[0];
            } catch {
                s_job_title = null;
            }
            try {
                s_company_linkedin_page = single_pos_obj.querySelector("a").href;
            } catch {
                s_company_linkedin_page = null;
            }
            try {
                s_company_logo_url = single_pos_obj.querySelector("img").src;
            } catch {
                s_company_logo_url = null;
            }
            try {
                s_company_name = single_pos_obj.querySelector("span.t-14").innerText.match(/.*?(?= · )/);
                if (s_company_name) {
                    s_company_name = s_company_name[0];
                } else {
                    s_company_name = single_pos_obj.querySelector("span.t-14").innerText.match(/.*?(?=\n)/)[0];
                }
            } catch {
                s_company_name = null;
            }
            experience.push(clean_json_for_position(s_company_name, s_company_linkedin_page,
                    s_company_logo_url, s_job_title, s_current, s_start_date,
                    s_end_date, s_work_full_address, s_description));
            res();
        })
    }
}

function login_linkedin(username, password) {
    let username_field = document.querySelector("input[id='username']");
    username_field.value = username;
    let password_field = document.querySelector("input[id='password']");
    password_field.value = password;
    setTimeout(() => { //submit after 2 sec
        document.querySelector('[data-litms-control-urn="login-submit"]').click();
    }, 2000);
}

if (window.name == "fetch-company-ID") {
    let company_ID = document.documentElement.outerHTML.match(/(?<=fs_normalized_company:).*?(?=\")/)[0]
    chrome.runtime.sendMessage({
        message: "fetched_company_ID",
        company_ID: company_ID
    });
    setTimeout(() => {
        window.close()
    }, 2000);
}
else if ((document.URL.includes("/company/") || document.URL.includes("/school/") || document.URL.includes("/showcase/")) && !document.URL.includes("/people/")) {
    console.log("First condition matched");
    var existCondition = setInterval(function () { //add limit 10 seconds, then send error message
        if ((window.name == "autoCompany" || document.URL.includes("?aut_acc")) && (document.querySelector("header.not-found__header") || document.querySelector("p.artdeco-empty-state__message"))) {
            chrome.runtime.sendMessage({
                message: "Company_Page_Not_Found",
            });
            clearInterval(existCondition);
            window.close();
        }
        //wait for loading page
        else if (document.querySelector(".mb4") || document.querySelector("main")) {
            console.log("Page Loaded");
            clearInterval(existCondition);
            extract_Company_Information();
        }
        //All Contacts LISTED
        else {
            console.log("*********waiting for page to load before extracting, in loop...**************");
        }
    }, 1000);
} 
// else if ((document.URL.includes("/company/") || document.URL.includes("/school/")) && document.URL.includes("/people/") && document.URL.includes("&aut_cont")) {
//         add_Extract_People_Buttons(5);
// } 
else if (document.URL.includes("&aut_cont")) {
    let old_count = document.querySelectorAll("li.grid ").length;
    let all_leads_link_to_extract = [];
    chrome.runtime.sendMessage({
        message: "message_For_Console",
        message_to_display: `Scrolling & Collecting All Employees for Specified Keyword`
    });
    let wait_for_number_Pages_Promise = new Promise((resolve, reject) => {
        //console.log("SCROLL ALL EMPLOYEES NEXT");
        setTimeout(function () {
            window.scrollBy({
                top: 10000,
                left: 100,
                behavior: 'smooth'
            });
            setTimeout(function () {
                scroll_ALL_pages_loop(old_count, resolve);
            }, 1200);
        }, 1000);

    }).then(function (value) {
        //collect all links container to lead linkedin page
        all_people = document.querySelectorAll("li.grid");
        console.log("all_people: " + all_people.length);
        //for each link, enter it in the array to be sent to background & extracted later
        let i = 0;
        for (i; i < all_people.length; ++i) {
            try {
                link = all_people[i].querySelector("div[type='circle']").querySelector("a").href;
                all_leads_link_to_extract.push(link);
            } catch {}
        }
    }).then(function (result) {
        chrome.runtime.sendMessage({
            message: "AUTOLIST_All_Contacts_for_keyword_list",
            leads_list: all_leads_link_to_extract
        });
        chrome.runtime.sendMessage({
            message: "message_For_Console",
            message_to_display: `Collected a total of ${all_leads_link_to_extract.length} profiles to be extracted next.`
        });
        chrome.runtime.sendMessage({
            message: "total_profiles",
            total_Profiles_no_Collected: `${all_leads_link_to_extract.length}`
        });

    }).then(() => window.close())
} 
else if (document.URL.includes("?one_cont=")) {
    console.log("Callin extract contact info");
    //scroll t to bottom of page to allow resources to load
    window.scrollTo(0, document.body.scrollHeight);
    setTimeout(function () {
        window.scrollTo({
            top: 100,
            left: 100,
            behavior: 'smooth'
        });
        setTimeout(function () {
            click_see_more_buttons();
            setTimeout(function () {
                console.log("extracting info now");
                extract_Contact_Information("one");
            }, 800);
        }, 1200);
    }, 1000);

} 
else if (document.URL.includes("?newauto")) {
    console.log("NEW AUTO call extract contact info");
    //scroll t to bottom of page to allow resources to load
    window.scrollTo(0, document.body.scrollHeight);
    setTimeout(function () {
        window.scrollTo({
            top: 100,
            left: 100,
            behavior: 'smooth'
        });
        setTimeout(function () {
            click_see_more_buttons();
            setTimeout(function () {
                extract_Contact_Information("?newauto");
            }, 800);
        }, 1200);
    }, 1000);
}
else if (document.URL.includes("/contact-info/")) {
    console.log("Extracting Email")
    chrome.runtime.sendMessage({
        message: "email_Info",
        email: extract_email(),
    })
    setTimeout(() => {
        try {
            let experience_URL = document.URL.replace("/overlay/contact-info/", "/details/experience/");
            window.open(experience_URL, "Fetch-Exp", "height=100,width=200", "_blank");
        } catch {}
    }, 500);
} 
else if (window.name == "Fetch-Exp") {
    console.log("Extracting Contact experience");
    setTimeout(() => {
        extract_contact_experience();
    }, 1000);
} 
else if (window.name == "login_linkedin") {
    chrome.runtime.sendMessage({
        message: "What_are_the_Linkedin_Credentials?"
    }, function (response) {
        login_linkedin(response.user, response.password);
    });
} 
else if (window.name == "Employees-Enrichment") {
    console.log("*** employee enrichment");
    async function conditions() {
        if ((await LS.getItem("last_page_scraped") != document.URL && await LS.getItem("last_page_scraped") != document.URL + "#" && !document.URL.includes("/contact-info/") && !document.URL.includes("/school/")) || document.URL.includes("?sin_acc")) {
            await LS.setItem("last_page_scraped", document.URL);
            console.log("Callin extract contact info after scrolling...");
            //scroll t to bottom of page to allow resources to load
            window.scrollTo(0, document.body.scrollHeight);
            setTimeout(function () {
                window.scrollTo({
                    top: 100,
                    left: 100,
                    behavior: 'smooth'
                });
                setTimeout(function () {
                    click_see_more_buttons()
                    setTimeout(function () {
                        console.log("extracting info now");
                        extract_Contact_Information("Employees-Enrichment");
                    }, 800);
                }, 1200);
            }, 1000);
        } 
        else {
            //contact already extracted
            chrome.runtime.sendMessage({
                message: "Contact_Enrichment_Already Extracted"
            })
            setTimeout(() => {
                window.close();
            }, 50);
        }
    }
    conditions()
} 
else {
    console.log("INSIDE ELSE FINAL");
    async function conditions() {
        if ((await LS.getItem("last_page_scraped") != document.URL && await LS.getItem("last_page_scraped") != document.URL + "#" && !document.URL.includes("/contact-info/") && !document.URL.includes("/school/")) || document.URL.includes("?sin_acc")) {
            await LS.setItem("last_page_scraped", document.URL);
            console.log("Callin extract contact info");
            //scroll t to bottom of page to allow resources to load
            window.scrollTo(0, document.body.scrollHeight);
            setTimeout(function () {
                window.scrollTo({
                    top: 100,
                    left: 100,
                    behavior: 'smooth'
                });
                setTimeout(function () {
                    click_see_more_buttons();
                    setTimeout(function () {
                        console.log("extracting info now")
                        if (document.URL.includes("?sin_acc")) {
                            extract_Contact_Information("Autolist-Contact");
                        } else {
                            extract_Contact_Information("false");
                        }
                    }, 800);
                }, 1200);
            }, 1000);
        }
    }
    conditions()
}
