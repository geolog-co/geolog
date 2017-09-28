{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE QuasiQuotes       #-}
{-# LANGUAGE RecordWildCards   #-}
{-# LANGUAGE TemplateHaskell   #-}
{-# LANGUAGE TypeFamilies      #-}
module Lib
    ( runApp
    ) where

import qualified Data.ByteString
import           Data.FileEmbed
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

-- Repeated ../ a bit horrible. Ideally path passed in at compile time?
index :: Data.ByteString.ByteString
index = $(embedFile "../../build/production/site/index.html")

data App = App

mkYesod "App" [parseRoutes|
/      HomeR  GET
/other OtherR GET
|]

instance Yesod App

getHomeR :: Handler Value
getHomeR = sendResponse (typeHtml, toContent index)

getOtherR :: Handler Value
getOtherR = returnJson $ Person "Matt" 25

runApp :: IO ()
runApp = warp 80 App
