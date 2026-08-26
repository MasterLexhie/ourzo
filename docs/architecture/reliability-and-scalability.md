# Ourzo — Reliability and Scalability

## 1. Reliability Goals

The MVP should fail predictably and preserve data integrity.

Primary concerns:

- Authentication failures
- Authorization failures
- Tenant-access failures
- Database failures
- Redis failures
- Rate-limit failures
- Usage-limit failures
- Partial failures

---

## 2. Failure Scenarios

### Authentication Failure

```text
Invalid credentials
 → Reject
 → Do not expose sensitive information
```

### Tenant Failure

```text
Invalid workspace membership
 → Reject
```

### Resource Failure

```text
Project does not exist
 → Return appropriate not-found response
```

### Authorization Failure

```text
User lacks permission
 → Reject
```

### Usage Failure

```text
Plan limit reached
 → Reject operation
 → Explain applicable limit
```

---

## 3. Redis Failure

Redis should not unnecessarily cause total application failure for functionality that does not strictly require Redis.

The application should define a controlled degradation strategy for Redis-dependent functionality such as rate limiting and caching.

---

## 4. Database Failure

The application should:

- Fail safely
- Avoid exposing internal database details
- Log the failure
- Return a controlled error
- Preserve data integrity

---

## 5. Partial Failure

Operations involving multiple capabilities must avoid inconsistent state.

Example:

```text
Create Project
 ↓
Database write succeeds
 ↓
Audit operation fails
```

The implementation must define whether the audit operation is:

- Transactional
- Retried
- Deferred
- Otherwise handled

The final strategy will be selected during implementation.

---

## 6. Initial Scale

```text
React
 ↓
NestJS
 ↓
PostgreSQL
 ↓
Redis
```

The first scalability optimizations should target:

- Database indexes
- Query performance
- Connection management
- Caching
- API performance
- Background processing

---

## 7. 10× Growth

Potential improvements:

- Database optimization
- Better indexes
- Query optimization
- Connection pooling
- Caching
- Background jobs
- Horizontal application scaling

---

## 8. 100× Growth

Potential additions:

- Read replicas
- Job queues
- More aggressive caching
- Database partitioning where justified
- Horizontal API scaling
- Dedicated workers

---

## 9. 1,000× Growth

Potential architecture:

```text
Load Balancer
      ↓
Multiple API Instances
      ↓
Shared PostgreSQL / Redis
      ↓
Background Workers
```

Individual high-load capabilities could eventually become independently deployed services.

---

## 10. gRPC

gRPC is not used in the MVP.

If capabilities such as:

- Notifications
- Usage
- Audit

are later extracted into independent services, gRPC becomes a candidate for internal service-to-service communication.

---

## 11. Microservices

Microservices are not introduced without a demonstrated need.

Possible extraction process:

```text
Identify bottleneck
       ↓
Define service boundary
       ↓
Define API/event contract
       ↓
Extract service
       ↓
Measure result
```

The modular monolith is therefore designed for evolution rather than immediate decomposition.
