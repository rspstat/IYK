# 빌드 스테이지: gradle wrapper로 부트 jar를 만든다.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# 의존성만 먼저 복사해서 캐시를 최대한 활용한다(소스만 바뀌면 의존성 다운로드는 다시 안 함).
COPY gradlew ./
COPY gradle ./gradle
COPY build.gradle settings.gradle ./
RUN chmod +x gradlew

COPY src ./src
# Render 빌드 서버는 IP 를 여러 사용자가 함께 써서 Maven Central 이 가끔 429(요청 과다)를 돌려준다. 일시적인 오류라 몇 번 다시 시도한다.
RUN n=0; until ./gradlew --no-daemon bootJar -x test; do       n=$((n+1));       if [ "$n" -ge 5 ]; then echo "빌드 재시도 5회 모두 실패"; exit 1; fi;       echo "빌드 실패, 30초 뒤 재시도($n/5)"; sleep 30;     done

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
