module.exports = {
  serviceAccount: {
    type: "service_account",
    project_id: process.env.PROJECT_ID,
    private_key_id: process.env.PRIVATE_KEY_ID,
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCiL/FHQxriiCb0\n5Ib9Db9C0glKj/85urEAoA6kMTasLET1Ysi31WGvDLzhiN03hzRqWUjXwqvCGeRt\nxqAWmMwX9K03uicGhobxPB7NMRsU47eItmUnIplOI6d9GfK2045tK8q/O816Dlfv\nkpR51AaSzHvK9FR99KWa0NqOZiJVcHQuZIXOKKh9ltZzllp3qodyez27xHHlDEGr\ny6IYZ/54p3jIauj58zrWmY1lHo5AL412vRajIAHM/nskCrfYm5yjeTWCdJU+Acto\n0TjWl/lL0VSi3iT3kqqzRJyCnUSgDa/mTbp8HnvfdaeU3LS3iF8eRf08HH5m7pYs\njOZiWIuFAgMBAAECggEADgbvqxylwulIotrvxXIYOrfxf5MXQ8LR4GTd1bVZIUH0\nHHVhnuvXEEc3QABQz0BXBOQM9anLphsMLRksXlfy8UpDMvP084HUdbrssdpCsw23\nOwOfZjRkjIpvFKKwyCXHuZYIg0qX5l8LaItFle9qOocLi9pe3MS5QyI3sz1bg20P\nd0k5c3dUFrKlAvKJTr+FbG8I+XqUSo30MhCX99Km2cmq5NIbogszUbE6MbH4iWd4\nJTl9zKI8Vg0ECGQ8Zvzn2MEEEan9o1+C8J1OTxZmaJbExKiWE5F/LfyYJW/v/IaI\nnUqTeZB4W2AZvtkqWKPavVxwkf//ET9HUsUS97pBrwKBgQDi39vePLTPoO7d/b2v\neIGb/06fJEfafTd/kRW3jk0QwWaatLuYqJM7Ts/zfosIlvz2+rJxdSYGlNd6anjw\nxftPxWr/6j8HML1wDWDqcy4jCPUiWFa7vyzCWa386HnLI0WlAtrpKIwdh4aPfaed\niKmmX27RH5/8GupWFIQibNoGcwKBgQC3AioncJwDsf3iEV/iliip305I/7Pdor4J\ntnHXiITdSHL7w7A7kRQq8Fn9a7zqGHdIGKrz9bjKnQM5TFydN5yJVOi1MPWOUL7x\neJhd1ceq4pnVNrnj8d/CwDRcYtSHjbHfrGWy4iWQofmVwpu11q9qrU7xrxkeyGdR\nFAmJPWQwJwKBgHaWLIbtlFUy+ahviUa+5oBz4tSsUiKScP/tBjz71Kx9avRSo/wX\noV3OxEOyUVocEf3G7J8BbO7jvf3uyWiRE9uOhW9fMbLAd0SquY3SxrrpY7igFDXu\np6au2ZLosUDNHwoxg9t7pkGJJXy7YXGmjYa5O2Nz9FwCdZqo/qg/3XahAoGAf3x8\njRj/NfvKVq+v0hK0pRGwYV3vmJgENpPn3jN2CwirQQNjQzufhwIETmu9IH6Gqay1\nellUr6CNXF77rXHOFEUYDxDaHpfVTDWsPsHr4/kTHNqQyF/4dpyaXTljwEJPBPf9\nqI2tiYGsck0tV5EEhhXRBr/pie4lOu/wbLBdmMUCgYAyz0B/dalnu/20A2BESOlu\nC20FNwS8iNH1Ui0W3UTRwguoIMjfgDtgYKUVuMHm4yPTemdiQqFC07SApCbLMuuM\nOl0WY8w0jG8j57LTOBr1PZYwOyJHDY6YUtz7sUgTUjCPwio490BdePjvhi3kj5sA\nhDozAd5IdTEvFWiWGFdUeA==\n-----END PRIVATE KEY-----\n",
    client_email: process.env.CLIENT_EMAIL,
    client_id: process.env.CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.CLIENT_X509_CERT_URL
  }
}