# 빌드 스테이지: gradle wrapper로 부트 jar를 만든다.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# 의존성만 먼저 복사해서 캐시를 최대한 활용한다(소스만 바뀌면 의존성 다운로드는 다시 안 함).
COPY gradlew ./
COPY gradle ./gradle
COPY build.gradle settings.gradle ./
RUN chmod +x gradlew

COPY src ./src
RUN ./gradlew --no-daemon bootJar -x test

# 실행 스테이지: JDK 대신 가벼운 JRE만 담는다.
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/libs/*-SNAPSHOT.jar app.jar

# Render 등 PaaS가 PORT 환경변수로 포트를 지정한다. EXPOSE는 문서화용(실제 바인딩은 application.yml의 server.port).
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
