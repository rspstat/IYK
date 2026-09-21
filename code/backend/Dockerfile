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

# 서버 시간대를 한국으로 맞춘다. 안 맞추면 컨테이너 기본(UTC) 기준으로 LocalDateTime 이 저장돼 댓글 시간이 9시간 어긋난다.
ENV TZ=Asia/Seoul

# Render 무료 플랜은 메모리가 512MB 라서 힙을 컨테이너 메모리의 75%까지 쓰게 하고, 작은 컨테이너에 맞는 SerialGC 를 쓴다
# (JVM 기본값은 메모리의 25%만 힙으로 잡아 시작 동기화 중 메모리가 모자랄 수 있다).
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-XX:+UseSerialGC", "-jar", "app.jar"]
