class AppException(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


class AuthenticationError(AppException):
    def __init__(self, detail: str = "Invalid or expired authentication token"):
        super().__init__(401, detail)


class AuthorizationError(AppException):
    def __init__(self, detail: str = "Not authorized"):
        super().__init__(403, detail)


class NotFoundError(AppException):
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(404, detail)