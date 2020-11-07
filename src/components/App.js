import React, { useEffect, useState, useRef } from 'react'
import './App.css'
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { HttpLink } from 'apollo-link-http'
import { useQuery } from '@apollo/react-hooks'
import gql from 'graphql-tag'
import { Card, CardHeader, CardBody, Row, Col } from 'reactstrap'
import { TelegramClient } from 'messaging-api-telegram'
import useSound from 'use-sound';

import { AlertTable} from './AlertTable'

import tokenJson from '../data/tokens.json'
import upSound from '../assets/sounds/success.mp3'
import downSound from '../assets/sounds/failure.mp3'


export const client = new ApolloClient({
  link: new HttpLink({
    uri: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2'
  }),
  fetchOptions: {
    mode: 'no-cors'
  },
  cache: new InMemoryCache()
})

const MULTI_TOKEN_QUERY = gql`
  query tokens($tokenAddresses: [Bytes]!) {
    tokens(where: {id_in: $tokenAddresses }) {
      id
      name
      derivedETH
    }
  }
`
const ETH_PRICE_QUERY = gql`
  query bundles {
    bundles(where: {id: "1"}) {
      ethPrice
    }
  }
`

const chatId = process.env.REACT_APP_TELEGRAM_BOT_CHAT_ID
const telegramClient = new TelegramClient({
  accessToken: process.env.REACT_APP_TELEGRAM_BOT_ACCESS_TOKEN,
})

telegramClient.getWebhookInfo().catch((error) => {
  console.log(error) // formatted error message
  console.log(error.stack) // error stack trace
  console.log(error.config) // axios request config
  console.log(error.request) // HTTP request
  console.log(error.response) // HTTP response
});

//TODO move to useRef or this kind of global declaration if also ok ?
const tokenAddresses = tokenJson.map(tokenInfo => tokenInfo.address)

const soundPlayer = process.env.REACT_APP_PLAY_SOUND

// TODO clear; devDependencies
// should I use gulp or webpack?

function App() {

  const refreshCounter = useRef(-1)
  const [playUpSound] = useSound(upSound);
  const [playDownSound] = useSound(downSound);

  const { loading: ethLoading, data: ethPriceData } = useQuery(ETH_PRICE_QUERY, { pollInterval: 3000 })

  const { loading: multiTokensLoading, data: multiTokensData } = useQuery(MULTI_TOKEN_QUERY, {
    variables:  {
      tokenAddresses: tokenAddresses
    },
    pollInterval: 30000
  })

  const tokens = multiTokensData && multiTokensData.tokens
  const ethPriceInUsd = ethPriceData && ethPriceData.bundles[0].ethPrice

  refreshCounter.current++
  updateAlerts()

  /**** functions ****/

  function sendTelegramMessage(message) {
    telegramClient.sendMessage(chatId, message).then(() => {
      console.log('message sent', message);
    });
  }

  function checkAlert(token, tokenAlerts, compareFunc, alertType) {
    if(!tokenAlerts) { console.log('Token not found in Json config file: ', token);  return [false, null] }

    const firstIncompleteAlert = tokenAlerts.find(alert => !alert.completed)
    if(firstIncompleteAlert) { //if there is incomplete alert found (otherwise it will be undefined value)
      const usdTokenPrice = (parseFloat(ethPriceInUsd) * parseFloat(token.derivedETH)).toFixed(4)
      console.log(`checkAlert : First incomplete alert ${alertType} : ${firstIncompleteAlert.value} for token ${token.name}, with current price: ${usdTokenPrice}`)
      if(compareFunc(usdTokenPrice, parseFloat(firstIncompleteAlert.value))) return [true, firstIncompleteAlert]
    }
    return [false, null]
  }

  function checkAlertUp(token) {
    const { alertsUp: tokenAlerts } = tokenJson.find(tokenInfo => tokenInfo.address === token.id)
    const isUp = (priceOne, priceTwo) => priceOne >= priceTwo
    return checkAlert(token, tokenAlerts, isUp, "UP")
  }

  function checkAlertDown(token) {
    const { alertsDown: tokenAlerts } = tokenJson.find(tokenInfo => tokenInfo.address === token.id)
    const isDown = (priceOne, priceTwo) => priceOne <= priceTwo
    return checkAlert(token, tokenAlerts, isDown, "DOWN")
  }

  function alertOnChange(token, isAlertActive, tokenAlert, alertType, playSound) {
    if (isAlertActive) {
      const usdTokenPrice = (parseFloat(ethPriceInUsd) * parseFloat(token.derivedETH)).toFixed(4)
      const msg = `Token alert: ${token.name} ${alertType} ${tokenAlert.value}$, price: ${usdTokenPrice}$`
      console.log(msg)
      sendTelegramMessage(msg)
      if(soundPlayer === 'on') playSound()
      tokenAlert.completed = true
    }
  }

  function updateAlerts() {
    if(multiTokensLoading || ethLoading) console.log('update tokens waiting for tokens to load', tokens)
    else {
      tokens.forEach(token => {
        const [isAlertActiveUp, tokenAlertUp] = checkAlertUp(token)
        const [isAlertActiveDown, tokenAlertDown] = checkAlertDown(token)
        alertOnChange(token, isAlertActiveUp, tokenAlertUp, 'UP', playUpSound)
        alertOnChange(token, isAlertActiveDown, tokenAlertDown, 'DOWN', playDownSound)
      })
    }
  }

  /******** render ********/

  return (
      <div className="content" style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f4f3ef"
      }}>
        <Row>
          <Col md="12">
            <Card  style={{ width: '68rem' }}>
              <CardHeader>
                <div style={{float: 'left', marginRight: '0.8rem'}}>Tokens</div>
                <div style={{float: 'right', marginLeft: '0.8rem'}}>Refresh count : {refreshCounter.current}</div>
                <div style={{float: 'right', marginRight: '0.8rem'}}><b>Eth price : {parseFloat(ethPriceInUsd).toFixed(2)}</b></div>
              </CardHeader>
              <CardBody>
                <AlertTable multiTokensLoading={multiTokensLoading} ethPriceInUsd={ethPriceInUsd} tokens={tokens} tokenJson={tokenJson}>
                </AlertTable>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
  );
}

export default App
