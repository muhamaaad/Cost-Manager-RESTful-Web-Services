import requests
import sys

filename = input("filename=")

# a = Logs service
# b = Users service
# c = Costs service
# d = Developers service

a = "https://cost-manager-logs-service.onrender.com"
b = "https://cost-manager-restful-web-services-0y3y.onrender.com"
c = "https://cost-manager-costs-service.onrender.com"
d = "https://cost-manager-admin-service.onrender.com"


output = open(filename, "w", encoding="utf-8")
sys.stdout = output

print("a=" + a)
print("b=" + b)
print("c=" + c)
print("d=" + d)
print()

print("testing getting the about")
print("-------------------------")

try:
    url = d + "/api/about/"
    data = requests.get(url)

    print("url=" + url)
    print("data.status_code=" + str(data.status_code))
    print(data.content)
    print("data.text=" + data.text)
    print(data.json())

except Exception as e:
    print("problem")
    print(e)

print("")
print()

print("testing getting the report - 1")
print("------------------------------")

try:
    url = c + "/api/report/?id=123123&year=2026&month=1"
    data = requests.get(url)

    print("url=" + url)
    print("data.status_code=" + str(data.status_code))
    print(data.content)
    print("data.text=" + data.text)

except Exception as e:
    print("problem")
    print(e)

print("")
print()

print("testing adding cost item")
print("----------------------------------")

try:
    url = c + "/api/add/"
    data = requests.post(url,
        json={'userid':123123, 'description':'milk 9','category':'food','sum':8})

    print("url=" + url)
    print("data.status_code=" + str(data.status_code))
    print(data.content)

except Exception as e:
    print("problem")
    print(e)

print("")
print()

print("testing getting the report - 2")
print("------------------------------")

try:
    url = c + "/api/report/?id=123123&year=2026&month=1"
    data = requests.get(url)

    print("url=" + url)
    print("data.status_code=" + str(data.status_code))
    print(data.content)
    print("data.text=" + data.text)

except Exception as e:
    print("problem")
    print(e)

print("")
