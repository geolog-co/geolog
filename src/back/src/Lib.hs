{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE QuasiQuotes       #-}
{-# LANGUAGE RecordWildCards   #-}
{-# LANGUAGE TemplateHaskell   #-}
{-# LANGUAGE TypeFamilies      #-}
module Lib
    ( runApp
    ) where

import           Data.Text (Text)
import           Yesod

data Person = Person
  { name :: Text 
  , age  :: Int
  }

instance ToJSON Person where
  toJSON Person {..} = object
    [ "name" .= name
    , "age"  .= age
    ]

data App = App

mkYesod "App" [parseRoutes|
/      HomeR  GET
/other OtherR GET
|]

instance Yesod App

getHomeR :: Handler Value
getHomeR = returnJson $ Person "Michal" 34

getOtherR :: Handler Value
getOtherR = returnJson $ Person "Matt" 25

runApp :: IO ()
runApp = warp 80 App
