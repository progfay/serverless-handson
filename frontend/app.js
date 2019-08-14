/* global window document localStorage fetch */

// Fill in with your values
const AUTH0_CLIENT_ID = 'kga2HLve9FaQDetNzakx28wGx8RLEI9W'
const AUTH0_DOMAIN = 'serverless-handson.auth0.com'
const AUTH0_CALLBACK_URL = window.location.href; // eslint-disable-line
const PUBLIC_ENDPOINT = 'https://p1193gk0i0.execute-api.ap-northeast-1.amazonaws.com/dev/api/timeline'
const PRIVATE_ENDPOINT = ' https://p1193gk0i0.execute-api.ap-northeast-1.amazonaws.com/dev/api/post'
const FOLLOW_ENDPOINT = 'https://p1193gk0i0.execute-api.ap-northeast-1.amazonaws.com/dev/api/follow'

// initialize auth0 lock
const lock = new Auth0Lock(AUTH0_CLIENT_ID, AUTH0_DOMAIN, { // eslint-disable-line no-undef
  auth: {
    params: {
      scope: 'openid email'
    },
    responseType: 'token id_token'
  }
})

function updateUI () {
  const isLoggedIn = localStorage.getItem('id_token')
  if (isLoggedIn) {
    // swap buttons
    document.getElementById('btn-login').style.display = 'none'
    document.getElementById('btn-logout').style.display = 'inline'
    const profile = JSON.parse(localStorage.getItem('profile'))
    // show username
    document.getElementById('nick').textContent = profile.email
  }
}

// Handle login
lock.on('authenticated', (authResult) => {
  console.log(authResult)
  lock.getUserInfo(authResult.accessToken, (error, profile) => {
    if (error) {
      // Handle error
      return
    }

    document.getElementById('nick').textContent = profile.nickname

    localStorage.setItem('accessToken', authResult.accessToken)
    localStorage.setItem('id_token', authResult.idToken)
    localStorage.setItem('profile', JSON.stringify(profile))

    updateUI()
  })
})

updateUI()

// Handle login
document.getElementById('btn-login').addEventListener('click', () => {
  lock.show()
})

// Handle logout
document.getElementById('btn-logout').addEventListener('click', () => {
  localStorage.removeItem('id_token')
  localStorage.removeItem('access_token')
  localStorage.removeItem('profile')
  document.getElementById('btn-login').style.display = 'flex'
  document.getElementById('btn-logout').style.display = 'none'
  document.getElementById('nick').textContent = ''
})

// Handle public api call
document.getElementById('btn-public').addEventListener('click', (e) => {
  e.preventDefault()

  const token = localStorage.getItem('id_token')

  const email = document.getElementById('email').value
  const url = new URL(PUBLIC_ENDPOINT)

  fetch(url, {
    cache: 'no-store',
    mode: 'cors',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: email
    })
  })
    .then(response => response.json())
    .then((data) => {
      console.log('Message:', data)
      const base = document.getElementById('messages')
      base.innerHTML = ''
      const template = document.getElementById('msgtmpl')
      data.msgs.forEach((msg) => {
        const msgrow = template.cloneNode(true)
        msgrow.querySelector('.msgtext').textContent = msg.text
        msgrow.querySelector('.msgemail').textContent = msg.id
        msgrow.querySelector('.msgdate').textContent = new Date(msg.timestamp)
        base.appendChild(msgrow)
      })
    })
    .catch((e) => {
      console.log('error', e)
    })
})

// Handle private api call
document.getElementById('btn-private').addEventListener('click', (e) => {
  e.preventDefault()
  const token = localStorage.getItem('id_token')
  fetch(PRIVATE_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: document.getElementById('text').value
    })
  })
    .then(response => response.json())
    .then((data) => {
      console.log('Token:', data)
      document.getElementById('message').textContent = ''
      document.getElementById('message').textContent = data.message
    })
    .catch((e) => {
      console.log('error', e)
    })
  return false
})

// Handle public api call
document.getElementById('btn-follow').addEventListener('click', (e) => {
  e.preventDefault()

  const token = localStorage.getItem('id_token')
  const id = document.getElementById('email').value
  const follow_id = document.getElementById('follow_id').value
  const url = new URL(FOLLOW_ENDPOINT)

  fetch(url, {
    cache: 'no-store',
    mode: 'cors',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ id, follow_id })
  })
    .then(response => response.text())
    .then((data) => {
      console.log('Message:', data)
    })
    .catch((e) => {
      console.log('error', e)
    })
})
