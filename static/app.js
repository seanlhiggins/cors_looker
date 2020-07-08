function stringify(obj) {
    return JSON.stringify(obj, null, 2)
}

function log(msg) {
    const txt = typeof msg === 'string' ? msg : stringify(msg)
    const x = document.getElementById("output")
    x.textContent = `${x.textContent}\n${txt}\n`
    return msg
}

function success(status) {
    return Math.trunc(status / 100) === 2
}

function clear_text() {
    document.getElementById("output").textContent = ""
}



async function api_login() {
    try {
        // expect this to fail, API login not supported via CORS
        log("POST https://HOSTEDINSTANCEURL.dev.looker.com:19999/api/4.0/login")
        const response = await fetch("https://HOSTEDINSTANCEURL.dev.looker.com:19999/api/4.0/login", {
            method: "POST",
            mode: "cors",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: "client_id=CLIENT_ID&client_secret=CLIENT_SECRET",
        })
        return log(await response.json())
    } catch (error) {
        log(error.message)
    }
}

let access_info = null

function api_request(route, params) {
    if (!access_info) {
        throw Error('You need to login first.')
    }
    const api_version = params.version || '4.0'
    delete params.version
    log(`${params.method} /api/${api_version}/${route}`)
    params.mode = "cors"

    if (!params.headers) {
        params.headers = {}
    }

    // set content-type header if not already set
    if (!params.headers['Content-Type'] && params.method != 'GET' && params.method != 'DELETE') {
        params.headers['Content-Type'] |= 'application/json;charset=UTF-8'
    }

    params.headers['x-looker-appid'] = 'Web App Auth & CORS API Demo'

    if (access_info && access_info.access_token) {
        params.headers["Authorization"] = `Bearer ${access_info.access_token}`
    }

    return fetch(`https://HOSTEDINSTANCEURL.dev.looker.com:19999/api/${api_version}/${route}`, params)
}

function api_get(url, params) {
    params.method = 'GET'
    return api_request(url, params)
}

function api_post(url, params) {
    params.method = 'POST'
    return api_request(url, params)
}

function api_delete(url) {
    const params = {}
    params.method = 'DELETE'
    return api_request(url, params)
}

async function api4_get_user() {
    try {
        const response = await api_get("user", {})
        log(`status: ${response.status}`)
        log(await response.json())
    } catch (e) {
        log(`Error: ${e.message}`)
    }
}

async function api31_get_user() {
    try {
        const response = await api_get("user", {
            version: '3.1'
        })
        log(`status: ${response.status}`)
        log(await response.json())
    } catch (e) {
        log(`Error: ${e.message}`)
    }
}

async function all_looks() {
    try {
        const response = await api_get("looks", {})
        const looks = await response.json()
        log(`looks count: ${looks.length}`)
    } catch (e) {
        log(`Error: ${e.message}`)
    }
}

async function updateCities(state) {
    state = state || ""
    console.log(state)
    const citydropdown = document.getElementById('dropdown-city')
    citydropdown.innerHTML = ''
    try {
        const response = await api_post("queries/run/json", {
            body: stringify({
                model: "thelook_shiggins",
                view: "order_items",
                fields: ["users.city"],
                filters: {
                    "users.state": state
                },
                limit: "5",
                sorts: ["order_items.count desc"]
            })
        })
        const city_results = await response.json()
        city_results.forEach(element => {
            console.log(element['users.city'])
            const item = document.createElement('option')
            item.value = `${element['users.city']}`
            item.text = `${element['users.city']}`
            item.class = `state_${element['users.city']}`
            citydropdown.appendChild(item)

        });
        
    } catch (e) {
        log(`Error: ${e.message}`)
    }
}
async function populate_states() {
    const dropdown = document.getElementById('dropdown-state')
    dropdown.innerHTML = ''
    try {
        const response = await api_post("queries/run/json", {
            body: stringify({
                model: "thelook_shiggins",
                view: "order_items",
                fields: ["users.state"],
                limit: "5",
                sorts: ["order_items.count desc"]
            })
        })
        const query_results = await response.json()
        console.log(query_results)
        log(`First State: ${query_results[0]['users.state']}`)
        if (dropdown) {
            query_results.forEach(element => {
                console.log(element['users.state'])
                const item = document.createElement('option')
                item.value = `${element['users.state']}`
                item.text = `${element['users.state']}`
                item.class = `state_${element['users.state']}`
                dropdown.appendChild(item)
            });
            // const dropdowns = document.getElementById('dropdown-state')
            dropdown.addEventListener('change', (e) => {
                updateCities(e.target.value)
                console.log(`e.target.value = ${ e.target.value }`);
                console.log(`dropdown.options[dropdown.selectedIndex].value = ${ dropdown.options[dropdown.selectedIndex].value }`);
            });
        }
    } catch (e) {
        log(`Error: ${e.message}`)
    }
    // dropdown.addEventListener("change", console.log('changed'))
}


async function create_look() {
    try {
        const r1 = await api_get("folders/home", {})
        const home_folder = await r1.json()

        const response = await api_post("looks?fields=id,title,query_id,folder_id", {
            body: stringify({
                title: `test look ${Math.trunc(Math.random() * 1000)}`,
                description: "this is a description",
                query_id: 123,
                folder_id: home_folder.id,
            }, null, 2),
        })
        if (response.status !== 200) {
            log(`${response.status} ${response.statusText}`)
            const json = await response.json()
            if (response.status === 422) {
                for (const error of json.errors) {
                    log(`${error.code} : ${error.field} ${error.message}`)
                }
            }
        } else {
            log(await response.json())
        }
    } catch (e) {
        log(`Error: ${e.message}`)
    }
}

function array_to_hex(array) {
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')
}

function secure_random(byte_count) {
    const array = new Uint8Array(byte_count);
    crypto.getRandomValues(array);
    return array_to_hex(array)
}

async function sha256_hash(message) {
    const msgUint8 = new TextEncoder().encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
    return array_to_hex(new Uint8Array(hashBuffer))
}

// Note! The Looker UI web service (port 9999 for dev instance) is
// required here, NOT the Looker API port
const base_url = "https://HOSTEDINSTANCEURL.dev.looker.com/auth"

async function oauth_login() {
    const code_verifier = secure_random(32)
    const code_challenge = await sha256_hash(code_verifier)
    const params = {
        response_type: 'code',
        client_id: 'CLIENT_GUID',
        redirect_uri: 'http://127.0.0.1:5000/authenticated',
        scope: 'cors_api',
        state: '1235813',
        code_challenge_method: 'S256',
        code_challenge: code_challenge,
    }
    const url = `${base_url}?${new URLSearchParams(params).toString()}`
    log(url)

    // Stash the code verifier we created in sessionStorage, which
    // will survive page loads caused by login redirects
    // The code verifier value is needed after the login redirect
    // to redeem the auth_code received for an access_token
    //
    sessionStorage.setItem('code_verifier', code_verifier)

    document.location = url
}

async function redeem_auth_code(response_str) {
    const params = new URLSearchParams(response_str)
    const auth_code = params.get('code')

    if (!auth_code) {
        log('ERROR: No auth code in response')
        return
    }
    log(`auth code received: ${auth_code}`)
    log(`state: ${params.get('state')}`)

    const code_verifier = sessionStorage.getItem('code_verifier')
    if (!code_verifier) {
        log('ERROR: Missing code_verifier in session storage')
        return
    }
    sessionStorage.removeItem('code_verifier')
    const response = await fetch('https://HOSTEDINSTANCEURL.dev.looker.com:19999/api/token', {
        method: 'POST',
        mode: 'cors',
        body: stringify({
            grant_type: 'authorization_code',
            client_id: 'CLIENT_GUID',
            redirect_uri: 'http://127.0.0.1:5000/authenticated',
            code: auth_code,
            code_verifier: code_verifier,
        }),
        headers: {
            'x-looker-appid': 'Web App Auth & CORS API Demo',
            'Content-Type': 'application/json;charset=UTF-8'
        },
    }).catch((error) => {
        log(`Error: ${error.message}`)
    })



    const info = await response.json()
    log(`/api/token response: ${stringify(info)}`)

    // Stash the access_token and other info in sessionStorage,
    // which will survive page reloads (like a cookie) but is not
    // shared across browser tabs (unlike cookies)
    // Session storage is private to this domain name, AND private to
    // this browser tab, and will be deleted when this browser tab is
    // closed.

    // To clear this sessionStorage value in the web app demo,
    // close the browser tab. SessionStorage survives page reload.
    // Or call logout() below
    const expires_at = new Date(Date.now() + (info.expires_in * 1000))
    info.expires_at = expires_at
    log(`Access token expires at ${expires_at.toLocaleTimeString()} local time.`)
    sessionStorage.setItem('access_info', stringify(info))
    access_info = info
}

async function logout() {
    if (access_info) {
        try {
            log('Logging out...')
            const response = await api_delete('logout', {})
            if (success(response.status)) {
                sessionStorage.removeItem('access_info')
                access_info = null
                log('...Done')
            } else {
                log(`response: ${response.status}`)
            }
        } catch (error) {
            log(`Error: ${error.message}`)
        }
    } else {
        log('Not logged in')
    }
}

async function page_load() {
    const response_str = sessionStorage.getItem('auth_code_response')
    if (response_str) {
        sessionStorage.removeItem('auth_code_response')
        await redeem_auth_code(response_str)
        return
    }

    const access_json = sessionStorage.getItem('access_info')
    const info = JSON.parse(access_json)
    if (info && info.access_token) {
        access_info = info
        log('Access token loaded from session storage')
        log(access_info)
        access_info.expires_at = new Date(access_info.expires_at)
        if (access_info.expires_at.valueOf() > Date.now()) {
            log(`Access token is valid until ${access_info.expires_at.toLocaleTimeString()} local time`)
        } else {
            log('Access token is expired.')
            access_info = null
        }
    }
}