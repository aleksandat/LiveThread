/*jslint browser: true, es5: true, indent: 4 */

"use strict";

var TEXT_RESPONSE_ERROR = "Response error",
    TEXT_PARSE_ERROR    = "Parse error",
    TEXT_NO_POSTS       = "No new posts",
    TEXT_POST_ADDED     = " new post",
    TEXT_POSTS_ADDED    = " new posts",
    TEXT_PENDING        = "Pending",
    TEXT_WAIT           = "Wait",
    TEXT_SPAM           = "\u0CA0_\u0CA0",
    TEXT_SECOND         = " second",
    TEXT_SECONDS        = " seconds",
    TEXT_MINUTE         = " minute",
    TEXT_MINUTES        = " minutes",
    TEXT_STOPPED        = "Stopped",
    TEXT_STARTING       = "Starting",
    TEXT_START          = "Start",
    TEXT_STOP           = "Stop",
    TEXT_UPDATE         = "Update",
    TEXT_CLOSE          = "Close",
    TEXT_SLOW           = "Slow",
    TEXT_NORMAL         = "Normal",
    TEXT_FAST           = "Fast",
    TEXT_PAGE           = "Page ",
    TEXT_CONFIRM_EXIT   = "NeoGAF Live Thread is on",
    TEXT_SPACER_CLOSE   = "Delete posts above this";

var STATE_LIVE          = false,
    STATE_PENDING       = false,
    STATE_FAIL_COUNT    = 0,
    STATE_FAIL_LIMIT    = 4,
    STATE_INTERVAL      = 60,
    STATE_URL           = window.location.href,
    STATE_NEXTPAGE      = false,
    STATE_TIMER         = null,
    STATE_DELAY         = null,
    STATE_CHECK_EDITS   = true;

var GAF_pagenavHead     = document.querySelectorAll("a.large-button[href^=newreply]")[0].parentNode.nextElementSibling,
    GAF_pagenavFoot     = document.querySelectorAll("a.large-button[href^=newreply]")[1].parentNode.nextElementSibling,
    GAF_postsContainer  = document.querySelector("#posts"),
    GAF_footerWrap      = document.querySelector("#footer > .wrap"),
    GAF_next            = document.querySelector(".pagenav a[rel=next]");

var UI_toggleHead       = document.createElement("button"),
    UI_toggleFoot       = document.createElement("button"),
    UI_optionSlow       = document.createElement("button"),
    UI_optionNorm       = document.createElement("button"),
    UI_optionFast       = document.createElement("button"),
    UI_actionStart      = document.createElement("button"),
    UI_actionStop       = document.createElement("button"),
    UI_options          = document.createElement("div"),
    UI_message          = document.createElement("div"),
    UI_info             = document.createElement("div"),
    UI_actions          = document.createElement("div"),
    UI_menu             = document.createElement("div");

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// UI Elements
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

UI_toggleHead.classList.add("live-toggle");

UI_toggleFoot.classList.add("live-toggle");

UI_optionSlow.classList.add("live-option");
UI_optionSlow.textContent = TEXT_SLOW;

UI_optionNorm.classList.add("live-option");
UI_optionNorm.classList.add("on");
UI_optionNorm.textContent = TEXT_NORMAL;

UI_optionFast.classList.add("live-option");
UI_optionFast.textContent = TEXT_FAST;

UI_options.classList.add("live-options");
UI_options.appendChild(UI_optionSlow);
UI_options.appendChild(UI_optionNorm);
UI_options.appendChild(UI_optionFast);

UI_message.classList.add("live-message");

UI_info.classList.add("live-info");
UI_info.appendChild(UI_options);
UI_info.appendChild(UI_message);

UI_actionStart.classList.add("live-action");
UI_actionStart.textContent = TEXT_START;

UI_actionStop.classList.add("live-action");
UI_actionStop.textContent = TEXT_STOP;

UI_actions.classList.add("live-actions");
UI_actions.appendChild(UI_actionStart);
UI_actions.appendChild(UI_actionStop);

UI_menu.setAttribute("hidden", "");
UI_menu.classList.add("live-menu");
UI_menu.appendChild(UI_info);
UI_menu.appendChild(UI_actions);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Page changes
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function checkReponse(response) {

    if (!response || !response.body) {
        STATE_FAIL_COUNT += 1;
        UI_message.textContent = TEXT_RESPONSE_ERROR;
        return;
    }

    function updatePage(np, s) {

        var fragment = document.createDocumentFragment();

        if (s) {
            fragment.appendChild(s);
        }

        np.forEach(function (p) {
            fragment.appendChild(p);
        });

        GAF_postsContainer.insertBefore(fragment, GAF_postsContainer.lastElementChild);

        STATE_FAIL_COUNT = 0;

        UI_message.textContent = np.length + ((np.length > 1) ? TEXT_POSTS_ADDED : TEXT_POST_ADDED);
    }

    function createSpacer(pn) {

        var title  = pn.querySelector("li[class=current] span").getAttribute("title"),
            number = pn.querySelector("li[class=current] strong").textContent,
            page   = document.createElement("a"),
            close  = document.createElement("a"),
            spacer = document.createElement("div");

        page.classList.add("live-spacer-page");
        page.setAttribute("href", STATE_URL);
        page.setAttribute("title", title);
        page.textContent = TEXT_PAGE + number;

        close.classList.add("live-spacer-close");
        close.setAttribute("title", TEXT_SPACER_CLOSE);
        close.textContent = TEXT_SPACER_CLOSE;
        close.addEventListener("click", function() {
            [].slice.call(document.querySelectorAll("#posts > *")).some(function(x) {
                if (x !== spacer) {
                    x.parentNode.removeChild(x);
                } else {
                    window.scrollTo(0, 0);
                    spacer.removeChild(close);
                    return true;
                }
            });
        }, false);

        spacer.classList.add("live-spacer");
        spacer.appendChild(page);
        spacer.appendChild(close);

        return spacer;
    }

    var newPagenav, newPosts, curPagenav, curPosts, spacer, next;

    try {
        newPagenav = response.querySelectorAll(".pagenav");
        newPosts   = [].slice.call(response.querySelectorAll("#posts > div[id^=edit]"), 0);

        if (newPagenav.length) {

            curPagenav = document.querySelectorAll(".pagenav");

            if (curPagenav.length) {
                if (STATE_NEXTPAGE) {
                    GAF_pagenavHead.replaceChild(newPagenav[0], curPagenav[0]);
                    GAF_pagenavFoot.replaceChild(newPagenav[1], curPagenav[1]);
                }
            } else {
                GAF_pagenavHead.appendChild(newPagenav[0]);
                GAF_pagenavFoot.appendChild(newPagenav[1]);
            }

        }

        if (STATE_NEXTPAGE) {
            if (newPagenav.length) {
                spacer = createSpacer(newPagenav[0]);
            }
        } else {
            curPosts = document.querySelectorAll("#posts > div[id^=edit]");
            curPosts = [].slice.call(curPosts, Math.max(curPosts.length - 100, 0));

            newPosts = newPosts.filter(function (a) {
                var newpost = true;
                curPosts.some(function (b) {
                    if (a.id === b.id) {
                        if (STATE_CHECK_EDITS) {
                            try {
                                var ax = a.querySelector("div.post").innerHTML,
                                    bx = b.querySelector("div.post").innerHTML;
                                if (ax !== bx) {
                                    GAF_postsContainer.replaceChild(a, b);
                                }
                            } catch (ignore) {}
                        }
                        newpost = false;
                        return true;
                    }
                });
                return newpost;
            });
        }

    } catch (e) {
        STATE_FAIL_COUNT += 1;
        UI_message.textContent = TEXT_PARSE_ERROR;
        return;
    }

    if (!newPosts.length) {
        STATE_FAIL_COUNT += 1;
        UI_message.textContent = TEXT_NO_POSTS;
        return;
    }

    updatePage(newPosts, spacer);

    if (newPagenav.length) {
        next = newPagenav[0].querySelector("a[rel=next]");
        if (next) {
            STATE_NEXTPAGE = true;
            STATE_URL = next.href;
        } else {
            STATE_NEXTPAGE = false;
        }
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Upate
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function confirmExit(e) {
    (e || window.event).returnValue = TEXT_CONFIRM_EXIT;
    return TEXT_CONFIRM_EXIT;
}

function updateComplete() {
    setTimeout(function() {
        STATE_PENDING = false;
        UI_message.textContent = TEXT_STOPPED;
        if (STATE_LIVE) {
            updateStart();
        }
    }, 5000);
}

function updateRequest() {

    clearInterval(STATE_TIMER);
    STATE_TIMER = null;
    STATE_PENDING = true;

    UI_actionStart.textContent = TEXT_PENDING;

    UI_message.textContent = TEXT_WAIT;

    try {
        var r = new XMLHttpRequest();
        r.open("GET", STATE_URL, true);
        r.responseType = "document";
        r.onload = function() {
            checkReponse(r.response);
            updateComplete();
        };
        r.onerror = function() {
            STATE_FAIL_COUNT += 1;
            updateComplete();
        };
        r.send(null);
    } catch (e) {
        // console.log(e);
        STATE_FAIL_COUNT += 1;
        updateComplete();
    }
}

function updateStop() {

    if (!STATE_LIVE) {
        STATE_PENDING = false;
        UI_menu.setAttribute("hidden", "");
        return;
    }

    clearInterval(STATE_TIMER);
    STATE_TIMER = null;
    STATE_LIVE = false;
    STATE_FAIL_COUNT = 0;

    UI_toggleHead.classList.remove("on");
    UI_toggleFoot.classList.remove("on");

    UI_actionStart.textContent = TEXT_START;
    UI_actionStop.textContent  = TEXT_CLOSE;

    UI_message.textContent = TEXT_STOPPED;

    window.removeEventListener("beforeunload", confirmExit, false);
}

function updateTick() {

    function time(n) {
        var t = "",
            s = Math.floor(n % 60),
            m = Math.floor((n / 60) % 60);
        if (m > 1) {
            t = m + TEXT_MINUTES + " ";
        } else {
            if (m === 1) {
                t = m + TEXT_MINUTE + " ";
            }
        }
        if (s > 1) {
            t += s + TEXT_SECONDS;
        } else {
            if (s === 1) {
                t += s + TEXT_SECOND;
            }
        }
        return t;
    }

    STATE_DELAY -= 1;

    UI_message.textContent = time(STATE_DELAY);

    if (STATE_DELAY <= 0) {
        return updateRequest();
    }
}

function updateStart() {

    if (STATE_PENDING) {
        STATE_LIVE = true;
        UI_message.textContent = TEXT_SPAM;
        return;
    }

    if (STATE_FAIL_COUNT > STATE_FAIL_LIMIT) {
        return updateStop();
    }

    if (STATE_TIMER) {
        STATE_FAIL_COUNT = 0;
        return updateRequest();
    }

    STATE_LIVE  = true;
    STATE_DELAY = STATE_INTERVAL * STATE_FAIL_COUNT || STATE_INTERVAL;
    STATE_TIMER = setInterval(updateTick, 1000);

    UI_toggleHead.classList.add("on");
    UI_toggleFoot.classList.add("on");

    UI_actionStart.textContent = TEXT_UPDATE;
    UI_actionStop.textContent  = TEXT_STOP;

    UI_message.textContent = TEXT_STARTING;

    UI_menu.removeAttribute("hidden");

    window.addEventListener("beforeunload", confirmExit, false);
}

function updateToggle() {
    if (STATE_LIVE) {
        updateStop();
    } else {
        updateStart();
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Actions
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

UI_toggleHead.addEventListener("click", updateToggle, false);
UI_toggleFoot.addEventListener("click", updateToggle, false);

UI_actionStart.addEventListener("click", updateStart, false);
UI_actionStop.addEventListener("click", updateStop, false);

UI_optionSlow.addEventListener("click", function () {
    STATE_INTERVAL = 120;
    UI_optionSlow.classList.add("on");
    UI_optionNorm.classList.remove("on");
    UI_optionFast.classList.remove("on");
}, false);

UI_optionNorm.addEventListener("click", function () {
    STATE_INTERVAL = 60;
    UI_optionSlow.classList.remove("on");
    UI_optionNorm.classList.add("on");
    UI_optionFast.classList.remove("on");
}, false);

UI_optionFast.addEventListener("click", function () {
    STATE_INTERVAL = 30;
    UI_optionSlow.classList.remove("on");
    UI_optionNorm.classList.remove("on");
    UI_optionFast.classList.add("on");
}, false);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// init
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

if (window.getComputedStyle(document.body, null).getPropertyValue("background-color") === "rgb(30, 30, 30)") {
    document.body.classList.add("live-dark");
}

GAF_pagenavHead.parentNode.insertBefore(UI_toggleHead, GAF_pagenavHead.parentNode.firstElementChild);
GAF_pagenavFoot.parentNode.insertBefore(UI_toggleFoot, GAF_pagenavFoot.parentNode.firstElementChild);
GAF_footerWrap.insertBefore(UI_menu, GAF_footerWrap.firstElementChild);

if (GAF_next) {
    STATE_NEXTPAGE = true;
    STATE_URL = GAF_next.href;
}
