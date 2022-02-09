module.exports = {
  serviceAccountAndroidReceipt: {
    type: "service_account",
    project_id: process.env.ANDROID_PROJECT_ID,
    private_key_id: process.env.ANDROID_PRIVATE_KEY_ID,
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCkoumuR7MMiV+D\n7mPumfZsz/Cf7CeyBzOPiwqmLDYCmoykza67TpF7w2ScC2reOMpM8RTSWogi/GZk\n60gxEKrhl9XTg0cxLYPJsYZBwDDF4ds876gzhQ52L/YT2q8Hk7w+AxQ02aMEoGF4\nTJoi+YWRuW4wD4MgK28xK/w4Uyqtnc5OxQMxyDJZrhwqnSrw81kBlKe7XtX0f6WZ\nMKazmpH1+8oBvMZWkHwEy1ZFyc5zcsLaLG9UYAblYxUwtIa6eDwvYC9zZomuJa95\nEmHoCTetS05OYxqrAsMmI9MZHNziS1Xsam0afTiYrufK7hvthkTfSgcBi1ZjgYp9\n29w0+oyPAgMBAAECggEAPKf/A2RMLc7A/5kJfWOBHGbiJvF5UIiBsR2Pj1iTj5ME\nRUW4Xi8cv6Xl/+3e8j+nHQDnZHbRWF54lS7wOo+C/bmUoKhpxs8XkmxS5A+ciJNl\nVEaRyGV5xgZ2masEuHxwKsK0o6IZgv9Z2doTIdafpOhWFePpMiV+gnXLp67QdwUo\nYl6lWhF2Nj+aJt+cjndwhA1yXqB9F2Guuf78NB2USulxiVu3k7JPoSSwR1f5F6a9\nq/hvbVxiqpeLJe0Jodz1zZUPqg32dh7agHa/5u3fjVnV29cUgg08CONjORu+tY19\nKQKUSmGxcq/GroewWZrpCP4pOnUt6YMZ0ftVHywYMQKBgQDjtLjeRGUVPTUg8/mI\nIdHJeI7QIdIv2FloWaudEJU36FF56s4aaYV2GRm3jqGtk9ej3TFhNt5tud4k8BZX\n6uQCvLo2EkEzEgc7bhF2cSoMLJXew5gjSc3aSVi5mg4ODn8IjOVSJNqEpwQuCr7W\nVzUGlzaRzwnW5MH8sP8vjHrx8QKBgQC5F/YKjTRKZEzp3OXVLiOff0pMHolkQSzh\naIhkJJ3AYedxBHR4GNpzO1dFxYv82bvmdDrchPoZeEHVWr7afxRSGm6+YZm0Zc9n\n57oOCW5UMpokl42vpdlqVmoIleap9a0HOkw3ClTjcwTbn0Kja6aMct175uwiCHOz\nbWARmn7mfwKBgQC9Se6kVpbxIQCZdDdrQzHyGZYezv67Z05rwJ844iApaabRgq/y\npOWdVyBZxugAM3Z/cdEqz0H4VRql+i+YxlrlK55gdKxemA4LCWTa4RfjJu0vUcmX\nDDNj0rU/FSG57bMMmJPJxXkh7PU8kRIzfCtIX0utyj6TtXbNaRW5oT5TAQKBgAw8\nFTtlUguIzby3qUmKHzivxU16x0IlPL45lqpn8TWCQzYpQTmfCvGK/p3SDQrNqan2\nDN3+vDlqxY9AzFTNCZ7TuHZFJU/TWv5XRukennhaT+4TRn5RzClHRQMERZb+ck2E\nAP2yZSITvEJ4KIN83ilyfkluXjVxsZQuqqb/O1wpAoGAXdJZ6Y568I+TkPyWZ77R\nsUm2VlyLXB/ihBX2pZ9VF575dRM/r9y2SQc5Cn4ft5MbiqeWPErlGiYgVhk1gLe2\n+RFIvxSxhRS8VwbKVRuabgfVXJxMKdECS2ifBWlEeUuMEgVYpr4PR5JhwOfD4GAM\n6rFkUzm6xGB/Ocx1BGG4FNo=\n-----END PRIVATE KEY-----\n",
    client_email: process.env.ANDROID_CLIENT_EMAIL,
    client_id: process.env.ANDROID_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.ANDROID_X509_CERT_URL
  }
}

